/**
 * 文档元数据层 —— 「一章长什么样」的唯一解析实现。
 *
 * 三个地方要用它，以前各写一遍、各错一处：
 *   1. books.ts          生成侧边栏（标题、顺序）
 *   2. scripts/check-books.mjs 站内自检（章节地图、order、notes）
 *   3. BookShelf.vue     首页书卡的章节数 / 字数 / 最近更新
 *
 * 只依赖 node 内置模块，不引第三方库；纯函数，能被 node --test 直接覆盖。
 */
import fs from 'node:fs'
import path from 'node:path'

export interface DocMeta {
  /** frontmatter 的 title → 正文第一个 H1 → 文件名去序号，逐级兜底 */
  title: string
  /** 没有 order（或写错）时是 MAX_SAFE_INTEGER，保证「未排序」排在最后而不是最前 */
  order: number
  hasOrder: boolean
  /** frontmatter 的 date，YYYY-MM-DD，没有则为空串 */
  date: string
  /** frontmatter 的 notes，素材来源，逗号分隔 */
  notes: string
  /** 解析出来的全部 frontmatter 字段（已去引号） */
  data: Record<string, string>
  /** 去掉 frontmatter 之后的正文 */
  body: string
  hasFrontmatter: boolean
}

export interface BookStats {
  dir: string
  /** 章节数，不含 index.md */
  chapters: number
  /** 正文字数，代码块不计 */
  words: number
  /** 最近一次成章的日期，YYYY-MM-DD，没章节则为空串 */
  updatedAt: string
}

const BOM = /^\uFEFF/
/** 围栏可以是 ``` 或 ~~~，允许 3 个以上，前面最多缩进 3 空格 */
const FENCE = /^ {0,3}(`{3,}|~{3,})(.*)$/
const CJK_ALL = /[\u3400-\u4dbf\u4e00-\u9fff]/g

/** 只去掉成对包裹的引号；标题里成单的引号（如 从"一句话"到"一份委托"）原样保留 */
export function unquote(value: string): string {
  const quoted = value.match(/^(['"])([\s\S]*)\1$/)
  return quoted ? quoted[2] : value
}

/** 文件名里的 01- / 01_ / 01. / 01、 前缀去掉，当标题兜底用 */
export function stripOrderPrefix(name: string): string {
  return name.replace(/^\d+\s*[-_.、\s]\s*/, '')
}

/**
 * 拆 frontmatter。两条硬约束，都是踩过坑才加的：
 *   1. 允许 UTF-8 BOM —— Windows 编辑器会写，BOM 会挡住行首的 ---
 *   2. 块里至少要有一个 `key:` 行才认作 frontmatter —— 正文用 --- 分节时（没有键值对），
 *      否则会把后面整段正文当成 YAML 吞掉，标题直接丢失
 */
export function splitFrontmatter(raw: string): { data: Record<string, string>; body: string; hasFrontmatter: boolean } {
  const text = String(raw).replace(BOM, '')
  const empty = { data: {}, body: text, hasFrontmatter: false }
  const block = text.match(/^---[ \t]*\r?\n([\s\S]*?)\r?\n---[ \t]*(?=\r?\n|$)/)
  if (!block) return empty

  const data: Record<string, string> = {}
  for (const line of block[1].split(/\r?\n/)) {
    const kv = line.match(/^([A-Za-z_][\w-]*)\s*:\s*(.*)$/)
    if (!kv) continue
    data[kv[1]] = unquote(kv[2].trim())
  }
  if (Object.keys(data).length === 0) return empty

  return { data, body: text.slice(block[0].length).replace(/^\r?\n/, ''), hasFrontmatter: true }
}

/**
 * 去掉围栏代码块，只留正文行。
 * 关栅必须是「同字符 + 长度不短于开栅 + 后面没有内容」：
 * 原来的写法遇到代码里出现一行 ```js 就提前收栅，后面的注释会被当成标题。
 */
export function stripFencedCode(body: string): string {
  const kept: string[] = []
  let fence: { char: string; len: number } | null = null

  for (const line of body.split(/\r?\n/)) {
    const hit = line.match(FENCE)
    if (hit) {
      const marker = hit[1]
      if (!fence) {
        fence = { char: marker[0], len: marker.length }
      } else if (marker[0] === fence.char && marker.length >= fence.len && hit[2].trim() === '') {
        fence = null
      }
      continue
    }
    if (fence) continue
    kept.push(line)
  }

  return kept.join('\n')
}

/** 正文里的第一个一级标题；代码块里的 `# 注释` 不算 */
export function findH1(body: string): string {
  for (const line of stripFencedCode(body).split(/\r?\n/)) {
    const h = line.match(/^ {0,3}#\s+(.+?)\s*$/)
    if (h) return h[1].replace(/\s+#+$/, '').trim()
  }
  return ''
}

/** 正文字数：中文按字、西文按词；代码块与行内代码不计 */
export function countWords(body: string): number {
  const text = stripFencedCode(body)
    .replace(/`[^`\n]*`/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/<[^>]+>/g, ' ')
  const cjk = (text.match(CJK_ALL) || []).length
  const latin = (text.match(/[A-Za-z0-9][A-Za-z0-9'’_-]*/g) || []).length
  return cjk + latin
}

/**
 * 正文里的相对文档链接（章节地图就靠它核对）。
 * 跳过外链、页内锚点、以 / 开头的站内绝对路径 —— 后者由 VitePress 自己管。
 */
export function relativeDocLinks(body: string): string[] {
  const text = stripFencedCode(body)
    .replace(/`[^`\n]*`/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')

  const links: string[] = []
  const re = /\[[^\]]*\]\(\s*<?([^)\s>]+)>?(?:\s+"[^"]*")?\s*\)/g
  let hit: RegExpExecArray | null
  while ((hit = re.exec(text)) !== null) {
    const target = hit[1]
    if (!target || target.startsWith('#')) continue
    if (/^[a-z][a-z0-9+.-]*:/i.test(target)) continue
    if (target.startsWith('/')) continue
    const file = target.split('#')[0].split('?')[0]
    if (file) links.push(file)
  }
  return links
}

/** 用本地时区取日期，避免 toISOString() 在东八区凌晨退回昨天 */
export function localDay(date: Date = new Date()): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** 解析一段 markdown 文本的元数据（不碰磁盘，方便测试） */
export function parseDocMeta(raw: string, fallbackSlug = ''): DocMeta {
  const { data, body, hasFrontmatter } = splitFrontmatter(raw)
  const orderRaw = (data.order ?? '').trim()
  const orderNum = orderRaw === '' ? Number.NaN : Number(orderRaw)
  const hasOrder = Number.isFinite(orderNum)

  return {
    // 空 order 的 Number('') 是 0，会把「未排序」误当成排在最前，所以先判空字符串
    title: data.title || findH1(body) || stripOrderPrefix(fallbackSlug),
    order: hasOrder ? orderNum : Number.MAX_SAFE_INTEGER,
    hasOrder,
    date: /^\d{4}-\d{2}-\d{2}/.test(data.date || '') ? (data.date as string).slice(0, 10) : '',
    notes: data.notes || '',
    data,
    body,
    hasFrontmatter,
  }
}

export function readDocMeta(file: string, fallbackSlug = ''): DocMeta {
  return parseDocMeta(fs.readFileSync(file, 'utf8'), fallbackSlug)
}

function mdFiles(dir: string): string[] {
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isFile() && e.name.endsWith('.md'))
    .map((e) => e.name)
}

/**
 * 统计每本书写了多少：章节数、字数、最近更新日期。
 * 扫描范围和侧边栏保持一致（书目录第一层 + 一层子目录），否则首页数字和侧边栏对不上。
 */
export function collectBookStats(docsDir: string, books: { dir: string }[]): Record<string, BookStats> {
  const result: Record<string, BookStats> = {}

  for (const book of books) {
    const abs = path.join(docsDir, book.dir)
    const files: string[] = []
    if (fs.existsSync(abs)) {
      for (const name of mdFiles(abs)) {
        if (name !== 'index.md') files.push(path.join(abs, name))
      }
      for (const entry of fs.readdirSync(abs, { withFileTypes: true })) {
        if (!entry.isDirectory()) continue
        const sub = path.join(abs, entry.name)
        for (const name of mdFiles(sub)) files.push(path.join(sub, name))
      }
    }

    let words = 0
    let updatedAt = ''
    for (const file of files) {
      const meta = readDocMeta(file)
      words += countWords(meta.body)
      // 优先用 frontmatter 的 date：CI 检出会把 mtime 全刷成构建当天，不能当更新日期
      const day = meta.date || localDay(fs.statSync(file).mtime)
      if (day > updatedAt) updatedAt = day
    }

    result[book.dir] = { dir: book.dir, chapters: files.length, words, updatedAt }
  }

  return result
}

/** 12345 → 1.2 万字；不足一万按原样 */
export function formatWords(words: number): string {
  if (!words) return '0 字'
  if (words < 10000) return `${words} 字`
  const wan = (words / 10000).toFixed(1).replace(/\.0$/, '')
  return `${wan} 万字`
}

export function formatDay(day: string): string {
  return /^\d{4}-\d{2}-\d{2}$/.test(day) ? day.slice(5) : '—'
}
