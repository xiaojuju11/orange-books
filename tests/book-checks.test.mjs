import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { runChecks, countIssues } from '../scripts/lib/book-checks.ts'

function fixture(files) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'orange-books-check-'))
  for (const [rel, content] of Object.entries(files)) {
    const abs = path.join(root, rel)
    fs.mkdirSync(path.dirname(abs), { recursive: true })
    fs.writeFileSync(abs, content, 'utf8')
  }
  return root
}

function check(root, books) {
  const result = runChecks({ rootDir: root, docsDir: path.join(root, 'docs'), books })
  return { ...result, ...countIssues(result.issues) }
}

const healthy = {
  'docs/a/index.md': '# A\n\n| 章 |\n| --- |\n| [第 1 章](ch01-one.md) |\n',
  'docs/a/ch01-one.md': '---\ntitle: 第 1 章 一\norder: 1\ndate: 2026-11-02\n---\n正文\n',
  'docs/b/index.md': '# B\n',
}

test('健康的书架不报任何问题', () => {
  const root = fixture(healthy)
  const { issues, errors, books } = check(root, [
    { dir: 'a', text: 'A', status: 'writing' },
    { dir: 'b', text: 'B', status: 'planned' },
  ])
  assert.deepEqual(issues, [])
  assert.equal(errors, 0)
  assert.equal(books[0].chapters, 1)
})

test('书目登记了但目录不存在 → error', () => {
  const root = fixture(healthy)
  const { issues } = check(root, [{ dir: 'ghost', text: '幽灵书', status: 'planned' }])
  assert.ok(issues.some((i) => i.level === 'error' && i.file === 'docs/ghost/' && /404/.test(i.message)))
})

test('缺 index.md → error', () => {
  const root = fixture({ 'docs/a/ch01-one.md': '---\ntitle: 一\norder: 1\n---\n正文\n' })
  const { issues } = check(root, [{ dir: 'a', text: 'A', status: 'writing' }])
  assert.ok(issues.some((i) => i.level === 'error' && i.file === 'docs/a/index.md'))
})

test('章节不在章节地图里 → warn；地图链接指向不存在的文件 → error', () => {
  const root = fixture({
    'docs/a/index.md': '# A\n\n[第 1 章](ch01-one.md)\n[第 9 章](ch09-gone.md)\n',
    'docs/a/ch01-one.md': '---\ntitle: 一\norder: 1\n---\n正文\n',
    'docs/a/ch02-two.md': '---\ntitle: 二\norder: 2\n---\n正文\n',
  })
  const { issues } = check(root, [{ dir: 'a', text: 'A', status: 'writing' }])
  assert.ok(issues.some((i) => i.level === 'warn' && i.file === 'docs/a/ch02-two.md' && /章节地图/.test(i.message)))
  assert.ok(issues.some((i) => i.level === 'error' && /ch09-gone\.md/.test(i.message)))
})

test('order 重复 → error；缺 order → warn', () => {
  const root = fixture({
    'docs/a/index.md': '# A\n\n[一](ch01-one.md) [二](ch02-two.md) [三](ch03-three.md)\n',
    'docs/a/ch01-one.md': '---\ntitle: 一\norder: 1\n---\n正文\n',
    'docs/a/ch02-two.md': '---\ntitle: 二\norder: 1\n---\n正文\n',
    'docs/a/ch03-three.md': '---\ntitle: 三\n---\n正文\n',
  })
  const { issues } = check(root, [{ dir: 'a', text: 'A', status: 'writing' }])
  assert.ok(issues.some((i) => i.level === 'error' && /order: 1 .*共用/.test(i.message)))
  assert.ok(issues.some((i) => i.level === 'warn' && i.file === 'docs/a/ch03-three.md' && /缺 order/.test(i.message)))
})

test('notes 指向不存在的素材 → error', () => {
  const root = fixture({
    'docs/a/index.md': '# A\n\n[一](ch01-one.md)\n',
    'docs/a/ch01-one.md': '---\ntitle: 一\norder: 1\nnotes: notes/2026-11-08.md, notes/2026-11-09.md\n---\n正文\n',
    'notes/2026-11-08.md': '# 2026-11-08\n',
  })
  const { issues } = check(root, [{ dir: 'a', text: 'A', status: 'writing' }])
  assert.ok(issues.some((i) => i.level === 'error' && /2026-11-09\.md/.test(i.message)))
})

test('notes 文件名与正文日期不一致 → error', () => {
  const root = fixture({
    'docs/a/index.md': '# A\n',
    'notes/2026-11-08.md': '# 2026-11-09\n\n记错天了\n',
  })
  const { issues } = check(root, [{ dir: 'a', text: 'A', status: 'planned' }])
  assert.ok(issues.some((i) => i.level === 'error' && /不是同一天/.test(i.message)))
})

test('同一本书里标题重复 → warn', () => {
  const root = fixture({
    'docs/a/index.md': '# A\n\n[一](ch01-one.md) [二](ch02-two.md)\n',
    'docs/a/ch01-one.md': '---\ntitle: 同名\norder: 1\n---\n正文\n',
    'docs/a/ch02-two.md': '---\ntitle: 同名\norder: 2\n---\n正文\n',
  })
  const { issues } = check(root, [{ dir: 'a', text: 'A', status: 'writing' }])
  assert.ok(issues.some((i) => i.level === 'warn' && /重复出现/.test(i.message)))
})

test('目录重复登记 → error，不重复输出两份统计', () => {
  const root = fixture(healthy)
  const { issues, books } = check(root, [
    { dir: 'a', text: 'A', status: 'writing' },
    { dir: 'a', text: 'A 又一次', status: 'planned' },
  ])
  assert.ok(issues.some((i) => i.level === 'error' && /重复登记/.test(i.message)))
  assert.equal(books.length, 1)
})

test('子目录里的章节同样参与统计与检查', () => {
  const root = fixture({
    'docs/a/index.md': '# A\n\n[三](part/ch03-three.md)\n',
    'docs/a/part/ch03-three.md': '---\ntitle: 三\norder: 3\n---\n正文\n',
  })
  const { issues, books } = check(root, [{ dir: 'a', text: 'A', status: 'writing' }])
  assert.deepEqual(issues, [])
  assert.equal(books[0].chapters, 1)
})
