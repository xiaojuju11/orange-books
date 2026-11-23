#!/usr/bin/env node
/**
 * 站内自检：npm run check
 *
 * 构建只会拦「链接死了」，不会拦「章节地图忘了更新」——后者才是文档站最常见的腐烂方式。
 * 这里把读者真的会踩的几类问题一次查完，有问题退出码 1，CI 直接红。
 *
 * 只用 Node 内置能力读 book-list.ts / doc-meta.ts（需要 Node ≥ 22.18 的类型擦除）。
 */
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { BOOKS } from '../docs/.vitepress/utils/book-list.ts'
import { runChecks, countIssues } from './lib/book-checks.ts'
import { formatWords } from '../docs/.vitepress/utils/doc-meta.ts'

const ROOT = fileURLToPath(new URL('../', import.meta.url))
const DOCS = path.join(ROOT, 'docs')

const { issues, books } = runChecks({ rootDir: ROOT, docsDir: DOCS, books: BOOKS })
const { errors, warns } = countIssues(issues)

console.log('\n小橘书房 · 站内自检\n')
console.log('书目')
for (const book of books) {
  const progress = book.chapters ? `${book.chapters} 章 · ${formatWords(book.words)}` : '还没动笔'
  console.log(`  · ${book.dir.padEnd(12)} ${progress}`)
}

if (issues.length > 0) {
  console.log('\n问题')
  for (const issue of issues) {
    console.log(`  ${issue.level === 'error' ? '✗' : '!'} ${issue.file}`)
    console.log(`    ${issue.message}`)
  }
}

if (errors > 0) {
  console.log(`\n✗ ${errors} 个错误 / ${warns} 个警告 —— 先修错误再推送\n`)
  process.exit(1)
}

console.log(`\n✓ 通过${warns ? `（${warns} 个警告，不阻塞）` : ''}\n`)
