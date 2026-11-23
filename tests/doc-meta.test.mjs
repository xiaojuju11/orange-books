import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import {
  parseDocMeta,
  splitFrontmatter,
  stripFencedCode,
  findH1,
  countWords,
  relativeDocLinks,
  unquote,
  stripOrderPrefix,
  localDay,
  formatWords,
  formatDay,
  collectBookStats,
} from '../docs/.vitepress/utils/doc-meta.ts'

test('unquote 只去成对的引号', () => {
  assert.equal(unquote('"第 1 章 语法地基"'), '第 1 章 语法地基')
  assert.equal(unquote("'单引号'"), '单引号')
  // 标题自带成单的引号，不能被吃掉
  assert.equal(unquote('第 1 章 从"一句话"到"一份委托"'), '第 1 章 从"一句话"到"一份委托"')
  assert.equal(unquote('没有引号'), '没有引号')
})

test('stripOrderPrefix 去掉文件名的序号前缀', () => {
  assert.equal(stripOrderPrefix('01-快速开始'), '快速开始')
  assert.equal(stripOrderPrefix('02_intro'), 'intro')
  assert.equal(stripOrderPrefix('ch00-setup'), 'ch00-setup')
})

test('splitFrontmatter 处理 BOM 与 CRLF', () => {
  const raw = '\uFEFF---\r\ntitle: 第 1 章\r\norder: 1\r\n---\r\n\r\n# 正文\r\n'
  const { data, body, hasFrontmatter } = splitFrontmatter(raw)
  assert.equal(hasFrontmatter, true)
  assert.equal(data.title, '第 1 章')
  assert.equal(data.order, '1')
  assert.equal(body.trim(), '# 正文')
})

test('splitFrontmatter 不把正文里的 --- 分节线当成 frontmatter', () => {
  // 没有 key: 行，说明是正文开头用 --- 分节，后面整段不能被吞
  const raw = '---\n# 真正的标题\n\n正文第一段\n---\n\n更多正文\n'
  const { data, body, hasFrontmatter } = splitFrontmatter(raw)
  assert.equal(hasFrontmatter, false)
  assert.deepEqual(data, {})
  assert.match(body, /真正的标题/)
  assert.match(body, /更多正文/)
})

test('splitFrontmatter 认不出闭合就直接当正文', () => {
  const raw = '---\ntitle: 只有开头的分隔符\n\n# 标题\n'
  assert.equal(splitFrontmatter(raw).hasFrontmatter, false)
  assert.equal(parseDocMeta(raw, 'fallback').title, '标题')
})

test('findH1 跳过围栏代码块里的注释', () => {
  const body = '前言\n\n```python\n# 这不是标题\n```\n\n# 真标题\n'
  assert.equal(findH1(body), '真标题')
})

test('findH1 不会被代码块里的 ```js 提前收栅', () => {
  const body = ['````md', '```js', '# 代码里的注释', '```', '````', '', '# 真标题'].join('\n')
  assert.equal(findH1(body), '真标题')
})

test('findH1 认 ~~~ 围栏，并去掉行尾的 ###', () => {
  assert.equal(findH1('~~~\n# 假的\n~~~\n\n# 真的 ##\n'), '真的')
})

test('stripFencedCode 保留普通正文行', () => {
  const body = 'a\n```\nb\n```\nc'
  assert.equal(stripFencedCode(body), 'a\nc')
})

test('countWords 中文按字、西文按词，代码不计', () => {
  // 中文 11 字（今天搞懂了 / 闭包 / 和 / 用 / 举例）+ 英文 1 词 closure
  // 代码块里的 const a = 1 与行内代码 code 都不计入
  assert.equal(countWords('今天搞懂了 闭包 和 closure。\n\n```js\nconst a = 1\n```\n\n用 `code` 举例'), 12)
})

test('relativeDocLinks 只留相对文档链接', () => {
  const body = [
    '[第 1 章](ch01-brief.md)',
    '[带锚点](ch02.md#小节)',
    '[外链](https://example.com/a.md)',
    '[站内绝对](/python/)',
    '[页内](#本章)',
    '![图](./img/a.png)',
    '行内代码里的 `[不算](x.md)`',
  ].join('\n')
  assert.deepEqual(relativeDocLinks(body), ['ch01-brief.md', 'ch02.md'])
})

test('parseDocMeta 的 order 缺省排在最后', () => {
  assert.equal(parseDocMeta('---\ntitle: A\n---\n').order, Number.MAX_SAFE_INTEGER)
  assert.equal(parseDocMeta('---\ntitle: A\norder:\n---\n').order, Number.MAX_SAFE_INTEGER)
  assert.equal(parseDocMeta('---\ntitle: A\norder: abc\n---\n').order, Number.MAX_SAFE_INTEGER)
  assert.equal(parseDocMeta('---\ntitle: A\norder: 0\n---\n').order, 0)
})

test('parseDocMeta 标题逐级兜底', () => {
  assert.equal(parseDocMeta('---\ntitle: 来自 frontmatter\n---\n# H1\n').title, '来自 frontmatter')
  assert.equal(parseDocMeta('---\norder: 1\n---\n# 来自 H1\n').title, '来自 H1')
  assert.equal(parseDocMeta('# 空的\n', '09-最后兜底').title, '空的')
  assert.equal(parseDocMeta('没有标题\n', '09-最后兜底').title, '最后兜底')
})

test('parseDocMeta 只接受合法的 date', () => {
  assert.equal(parseDocMeta('---\ntitle: A\ndate: 2026-11-08\n---\n').date, '2026-11-08')
  assert.equal(parseDocMeta('---\ntitle: A\ndate: 上周\n---\n').date, '')
})

test('formatWords / formatDay', () => {
  assert.equal(formatWords(0), '0 字')
  assert.equal(formatWords(934), '934 字')
  assert.equal(formatWords(10000), '1 万字')
  assert.equal(formatWords(18205), '1.8 万字')
  assert.equal(formatDay('2026-11-08'), '11-08')
  assert.equal(formatDay(''), '—')
})

test('localDay 用本地时区而不是 UTC', () => {
  const day = new Date(2026, 10, 9, 0, 30) // 本地 11-09 00:30，UTC 还是 11-08
  assert.equal(localDay(day), '2026-11-09')
})

function fixture(files) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'orange-books-'))
  for (const [rel, content] of Object.entries(files)) {
    const abs = path.join(root, rel)
    fs.mkdirSync(path.dirname(abs), { recursive: true })
    fs.writeFileSync(abs, content, 'utf8')
  }
  return root
}

test('collectBookStats 统计章节数、字数与最近日期', () => {
  const root = fixture({
    'docs/a/index.md': '# A\n',
    'docs/a/ch01-one.md': '---\ntitle: 一\norder: 1\ndate: 2026-11-02\n---\n一二三\n',
    'docs/a/ch02-two.md': '---\ntitle: 二\norder: 2\ndate: 2026-11-10\n---\n四五六七\n',
    'docs/a/part/ch03-three.md': '---\ntitle: 三\norder: 3\ndate: 2026-11-05\n---\n八九\n',
    'docs/b/index.md': '# B\n',
  })
  const stats = collectBookStats(path.join(root, 'docs'), [{ dir: 'a' }, { dir: 'b' }, { dir: 'missing' }])

  assert.equal(stats.a.chapters, 3) // index.md 不算章节
  assert.equal(stats.a.words, 3 + 4 + 2)
  assert.equal(stats.a.updatedAt, '2026-11-10')
  assert.equal(stats.b.chapters, 0)
  assert.equal(stats.b.updatedAt, '')
  assert.equal(stats.missing.chapters, 0) // 目录不存在时不能抛错
})
