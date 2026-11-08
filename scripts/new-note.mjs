#!/usr/bin/env node
/**
 * 开今天的素材条：npm run note            （今天的日期）
 *              npm run note -- 2026-11-09 （指定日期）
 * 只创建，不覆盖已存在的文件。
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = fileURLToPath(new URL('../', import.meta.url))
const NOTES = path.join(ROOT, 'notes')
fs.mkdirSync(NOTES, { recursive: true })

const arg = process.argv[2]
const day = arg && /^\d{4}-\d{2}-\d{2}$/.test(arg) ? arg : new Date().toISOString().slice(0, 10)
const file = path.join(NOTES, `${day}.md`)

if (fs.existsSync(file)) {
  console.log(`今天已经开了：notes/${day}.md`)
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
