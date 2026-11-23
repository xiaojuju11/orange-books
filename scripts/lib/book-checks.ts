/**
 * 站内自检的规则实现（纯逻辑，不打印、不退出进程），方便用 node --test 直接喂 fixture 测试。
 *
 * 只查「构建能过、但读者会踩坑」的那几类问题：
 *   - 书目登记了、目录却不存在 → 书卡 404
 *   - 章节地图漏了新章 / 指向已删的章 → 导读和实际内容对不上
 *   - 同一本书 order 重复或缺失 → 侧边栏顺序随机
 *   - frontmatter 的 notes 指向不存在的素材 → 回溯链断掉
 *   - notes/ 文件名与正文日期不一致 → 素材挂错天
 */
import fs from 'node:fs'
import path from 'node:path'

import { readDocMeta, relativeDocLinks, countWords } from '../../docs/.vitepress/utils/doc-meta.ts'

/** 约定：chNN-英文短横线.md（NN 至少两位，纯数字） */
const CHAPTER_NAME = /^ch\d{2,}-[a-z0-9]+(?:-[a-z0-9]+)*\.md$/
const NOTE_NAME = /^(\d{4}-\d{2}-\d{2})\.md$/
const SCAN_SUBDIR_DEPTH = 1

export interface Issue {
  level: 'error' | 'warn'
  file: string
  message: string
}

export interface BookSummary {
  dir: string
  text: string
  chapters: number
  words: number
}

export interface CheckResult {
  issues: Issue[]
  books: BookSummary[]
}

interface CheckOptions {
  /** 仓库根目录，用来核对 notes/ 路径 */
  rootDir: string
  /** docs 目录绝对路径 */
  docsDir: string
  books: { dir: string; text: string; status: string }[]
}

function isDir(target: string): boolean {
  return fs.existsSync(target) && fs.statSync(target).isDirectory()
}

/** 和侧边栏保持一致的扫描范围：书目录第一层 + 一层子目录 */
function collectChapters(bookDir: string): { name: string; rel: string; abs: string }[] {
  const out: { name: string; rel: string; abs: string }[] = []
  const push = (abs: string, rel: string, name: string) => {
    if (name === 'index.md' || !name.endsWith('.md')) return
    out.push({ name, rel, abs })
  }

  for (const entry of fs.readdirSync(bookDir, { withFileTypes: true })) {
    if (entry.isFile()) {
      push(path.join(bookDir, entry.name), entry.name, entry.name)
    } else if (entry.isDirectory() && SCAN_SUBDIR_DEPTH > 0) {
      const sub = path.join(bookDir, entry.name)
      for (const child of fs.readdirSync(sub, { withFileTypes: true })) {
        if (!child.isFile()) continue
        push(path.join(sub, child.name), path.posix.join(entry.name, child.name), child.name)
      }
    }
  }
  return out
}

/** notes 字段可能是 "a.md, b.md"，也可能是 YAML 列表的 "a.md b.md" */
function splitNotes(value: string): string[] {
  return value
    .split(/[,，\s]+/)
    .map((item) => item.trim())
    .filter(Boolean)
}

export function runChecks({ rootDir, docsDir, books }: CheckOptions): CheckResult {
  const issues: Issue[] = []
  const summary: BookSummary[] = []
  const add = (level: Issue['level'], file: string, message: string) => issues.push({ level, file, message })

  if (books.length === 0) add('error', 'docs/.vitepress/utils/book-list.ts', 'BOOKS 是空的，首页一本书都没有')

  const seenDirs = new Set<string>()

  for (const book of books) {
    const bookPath = `docs/${book.dir}/`
    if (seenDirs.has(book.dir)) {
      add('error', 'docs/.vitepress/utils/book-list.ts', `目录 "${book.dir}" 重复登记，侧边栏和书卡会互相覆盖`)
      continue
    }
    seenDirs.add(book.dir)

    if (!book.dir || /[\\/]/.test(book.dir)) {
      add('error', 'docs/.vitepress/utils/book-list.ts', `目录名 "${book.dir}" 非法：它同时是网址前缀，只能是一层`)
      continue
    }

    const bookDir = path.join(docsDir, book.dir)
    if (!isDir(bookDir)) {
      add('error', bookPath, '书目里登记了这本书，但目录不存在 —— 首页书卡点进去是 404')
      continue
    }

    const indexFile = path.join(bookDir, 'index.md')
    const indexExists = fs.existsSync(indexFile)
    if (!indexExists) add('error', `${bookPath}index.md`, '缺导读页 —— 侧边栏「本书导读」和书卡都指向空页')

    const chapters = collectChapters(bookDir)
    let words = 0
    const orderSeen = new Map<number, string[]>()
    const titleSeen = new Map<string, string[]>()

    for (const chapter of chapters) {
      const where = `${bookPath}${chapter.rel}`
      const meta = readDocMeta(chapter.abs, chapter.name.replace(/\.md$/, ''))
      words += countWords(meta.body)

      if (!CHAPTER_NAME.test(chapter.name)) {
        add('warn', where, '文件名建议 chNN-英文短横线.md（中文标题写在 frontmatter 的 title 里）')
      }
      if (!meta.hasFrontmatter) {
        add('warn', where, '没有 frontmatter，侧边栏标题只能靠正文 H1，顺序也只能按标题排')
      } else if (!meta.hasOrder) {
        add('warn', where, 'frontmatter 缺 order（或不是数字），这一章会被排到最后')
      } else {
        const same = orderSeen.get(meta.order) || []
        orderSeen.set(meta.order, [...same, chapter.rel])
      }

      if (meta.title) {
        const same = titleSeen.get(meta.title) || []
        titleSeen.set(meta.title, [...same, chapter.rel])
      }

      for (const note of splitNotes(meta.notes)) {
        const notePath = path.resolve(rootDir, note)
        if (!fs.existsSync(notePath)) {
          add('error', where, `notes 里的 "${note}" 不存在，这章追不回素材了`)
        }
      }
    }

    for (const [order, files] of orderSeen) {
      if (files.length > 1) {
        add('error', `${bookPath}${files[0]}`, `order: ${order} 被 ${files.join(' 和 ')} 共用，侧边栏顺序会不稳定`)
      }
    }
    for (const [title, files] of titleSeen) {
      if (files.length > 1) {
        add('warn', `${bookPath}${files[0]}`, `标题「${title}」重复出现在 ${files.join(' 和 ')}，侧边栏会分不清`)
      }
    }

    if (indexExists && chapters.length > 0) {
      const indexMeta = readDocMeta(indexFile)
      const linked = new Set<string>()
      for (const link of relativeDocLinks(indexMeta.body)) {
        const resolved = path.posix.normalize(link)
        if (!resolved.endsWith('.md')) continue
        linked.add(resolved)
        if (!fs.existsSync(path.join(bookDir, resolved))) {
          add('error', `${bookPath}index.md`, `章节地图指向 ${link}，但文件不存在`)
        }
      }
      for (const chapter of chapters) {
        if (!linked.has(chapter.rel)) {
          add('warn', `${bookPath}${chapter.rel}`, '不在 index.md 的章节地图里 —— 读者从导读找不到这一章')
        }
      }
    }

    summary.push({ dir: book.dir, text: book.text, chapters: chapters.length, words })
  }

  // 素材层：文件名就是日期，正文 H1 也应该是同一天
  const notesDir = path.join(rootDir, 'notes')
  if (isDir(notesDir)) {
    for (const entry of fs.readdirSync(notesDir, { withFileTypes: true })) {
      if (!entry.isFile() || entry.name === 'README.md' || !entry.name.endsWith('.md')) continue
      const where = `notes/${entry.name}`
      const nameMatch = entry.name.match(NOTE_NAME)
      if (!nameMatch) {
        add('warn', where, '文件名不是 YYYY-MM-DD.md，素材挂不到具体某天')
        continue
      }
      const meta = readDocMeta(path.join(notesDir, entry.name))
      const h1 = meta.title
      if (/\d{4}-\d{2}-\d{2}/.test(h1) && !h1.includes(nameMatch[1])) {
        add('error', where, `正文标题写的是「${h1}」，和文件名 ${nameMatch[1]} 不是同一天`)
      }
    }
  }

  const rank = { error: 0, warn: 1 }
  issues.sort((a, b) => rank[a.level] - rank[b.level] || a.file.localeCompare(b.file, 'zh-Hans-CN'))
  return { issues, books: summary }
}

export function countIssues(issues: Issue[]): { errors: number; warns: number } {
  return {
    errors: issues.filter((i) => i.level === 'error').length,
    warns: issues.filter((i) => i.level === 'warn').length,
  }
}
