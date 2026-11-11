#!/usr/bin/env node
/**
 * 开素材条：npm run note              （今天的本地日期）
 *          npm run note -- 2026-11-09 （指定日期）
 * 只创建，不覆盖已存在的文件。日期参数写错会直接报错，不会悄悄换成今天。
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = fileURLToPath(new URL('../', import.meta.url))
const NOTES = path.join(ROOT, 'notes')

/** 用本地时区的年月日，避免 toISOString() 的 UTC 日期在东八区凌晨退回昨天 */
function localDay(date = new Date()) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** 严格校验 YYYY-MM-DD，并确认是真实存在的日历日期（排除 2026-02-30 这类） */
function resolveDay(arg) {
  if (arg === undefined) return localDay()
  if (!/^\d{4}-\d{2}-\d{2}$/.test(arg)) {
    throw new Error(`日期格式应为 YYYY-MM-DD，收到 "${arg}"`)
  }
  const probe = new Date(`${arg}T00:00:00Z`)
  if (Number.isNaN(probe.getTime()) || probe.toISOString().slice(0, 10) !== arg) {
    throw new Error(`不是有效的日历日期：${arg}`)
  }
  return arg
}

const arg = process.argv[2]
let day
try {
  if (process.argv.length > 3) throw new Error('一次只能指定一个日期')
  day = resolveDay(arg)
} catch (err) {
  console.error(`✗ ${err.message}`)
  console.error('用法：npm run note [-- YYYY-MM-DD]')
  process.exit(1)
}

fs.mkdirSync(NOTES, { recursive: true })
const file = path.join(NOTES, `${day}.md`)

if (fs.existsSync(file)) {
  console.log(`已经存在，未覆盖：notes/${day}.md`)
  process.exit(0)
}

const template = `# ${day}

## 今天搞懂了什么
- 

## 代码 / 踩坑（原样贴，不用整理）
\`\`\`python
\`\`\`

## 卡在哪
- 

## 明天第一步
- 

## 归属章节
<!-- 不确定就留空，成书时我来判断 -->
`

fs.writeFileSync(file, template, 'utf8')
console.log(`已创建 notes/${day}.md`)
