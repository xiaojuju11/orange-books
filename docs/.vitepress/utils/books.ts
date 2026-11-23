import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { BOOKS } from './book-list'
import type { Book } from './book-list'
import { collectBookStats, readDocMeta, stripOrderPrefix } from './doc-meta'
import type { BookStats } from './doc-meta'

export { BOOKS }
export type { Book, BookStats }

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

/** 标题、顺序、BOM、围栏代码块这些解析细节都在 doc-meta.ts，这里只管拼侧边栏 */
function toItem(dir: string, fileName: string, urlBase: string): PageItem {
  const slug = fileName.replace(/\.md$/, '')
  const { title, order } = readDocMeta(path.join(dir, fileName), slug)
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

/** 首页书卡上的真实进度：章节数、字数、最近更新，构建时算一次，注入到客户端 */
export function buildBookStats(): Record<string, BookStats> {
  return collectBookStats(DOCS_DIR, BOOKS)
}
