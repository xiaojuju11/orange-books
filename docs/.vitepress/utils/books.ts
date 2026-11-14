import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { BOOKS } from './book-list'
import type { Book } from './book-list'

export { BOOKS }
export type { Book }

const DOCS_DIR = fileURLToPath(new URL('../../', import.meta.url))

interface PageItem {
  text: string
  link: string
  order: number
}

interface SidebarItem {
  text: string
  link?: string
  collapsed?: boolean
  items?: SidebarItem[]
}

function stripOrderPrefix(name: string): string {
  return name.replace(/^\d+\s*[-_.、\s]\s*/, '')
}

/** 只去掉成对包裹的引号；标题自带的（未成对）引号要原样保留 */
function unquote(value: string): string {
  const quoted = value.match(/^(['"])([\s\S]*)\1$/)
  return quoted ? quoted[2] : value
}

/** 只认 title / order 两个字段，够用，不引第三方依赖 */
function readMeta(file: string, fallback: string): { title: string; order: number } {
  // Windows 编辑器可能写入 UTF-8 BOM，会挡住文件开头的 --- 分隔符
  const raw = fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, '')
  const block = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/)
  let title = ''
  let order = Number.NaN

  if (block) {
    for (const line of block[1].split(/\r?\n/)) {
      const kv = line.match(/^([A-Za-z_][\w-]*)\s*:\s*(.*)$/)
      if (!kv) continue
      const value = unquote(kv[2].trim())
      if (kv[1] === 'title') title = value
      // 空 order 的 Number('') 是 0，会把「未排序」误当成排在最前
      if (kv[1] === 'order' && value !== '') order = Number(value)
    }
  }

  if (!title) {
    const body = block ? raw.slice(block[0].length) : raw
    const h1 = body.match(/^#\s+(.+)$/m)
    title = h1 ? h1[1].trim() : stripOrderPrefix(fallback)
  }

  return { title, order: Number.isFinite(order) ? order : Number.MAX_SAFE_INTEGER }
}

function mdFiles(dir: string): string[] {
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isFile() && e.name.endsWith('.md'))
    .map((e) => e.name)
}

function sortPages(pages: PageItem[]): PageItem[] {
  return pages.sort(
    (a, b) =>
      a.order - b.order ||
      a.text.localeCompare(b.text, 'zh-Hans-CN', { numeric: true }),
  )
}

function toItem(dir: string, fileName: string, urlBase: string): PageItem {
  const slug = fileName.replace(/\.md$/, '')
  const { title, order } = readMeta(path.join(dir, fileName), slug)
  return { text: title, link: `${urlBase}${slug}`, order }
}

/** 扫描 docs/<书>/ 自动生成侧边栏：新建 md 就自动出现，不用改配置 */
export function buildSidebar(book: Book): SidebarItem[] {
  const abs = path.join(DOCS_DIR, book.dir)
  const urlBase = `/${book.dir}/`
  if (!fs.existsSync(abs)) return []

  const rootPages = sortPages(
    mdFiles(abs)
      .filter((f) => f !== 'index.md')
      .map((f) => toItem(abs, f, urlBase)),
  )

  const groups: SidebarItem[] = fs
    .readdirSync(abs, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort((a, b) => a.localeCompare(b, 'zh-Hans-CN', { numeric: true }))
    .map((dirName) => {
      const sub = path.join(abs, dirName)
      const items = sortPages(mdFiles(sub).map((f) => toItem(sub, f, `${urlBase}${dirName}/`)))
      return {
        text: stripOrderPrefix(dirName),
        collapsed: false,
        items: items.map(({ text, link }) => ({ text, link })),
      }
    })
    .filter((g) => g.items && g.items.length > 0)

  return [
    {
      text: book.text,
      items: [{ text: '本书导读', link: urlBase }, ...rootPages.map(({ text, link }) => ({ text, link }))],
    },
    ...groups,
  ]
}

export function buildSidebars(): Record<string, SidebarItem[]> {
  const result: Record<string, SidebarItem[]> = {}
  for (const book of BOOKS) result[`/${book.dir}/`] = buildSidebar(book)
  return result
}
