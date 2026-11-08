# 小橘书房

每天学一点，写成一本本可以读完的书。用的是和 [LangChain.js 中文入门](https://cleversnail.github.io/lang-chain-js-cn/) 同一套做法：**Markdown 写内容 → 静态站构建 → push 自动上线**。

六本书共用一套骨架，但**默认只有一本处于「正在写」**：

| 书 | 目录 | 状态 |
| --- | --- | --- |
| Python 上手到实战 | `docs/python/` | ✍️ 正在写 |
| LangChain 应用开发 | `docs/langchain/` | 排队 |
| Go 入门到并发实战 | `docs/go/` | 排队 |
| Vibe Coding 实战 | `docs/vibecoding/` | 排队 |
| JavaScript 精讲 | `docs/js/` | 排队 |
| React 深度进阶 | `docs/react/` | 排队 |

## 目录结构

```
.
├─ notes/                       # 素材层：每天的原稿，不发布
│  └─ 2026-11-08.md
├─ docs/                        # 成书层：发布的内容
│  ├─ index.md                  # 书库首页
│  ├─ python/                   # 一本书 = 一个目录 = 网址前缀 /python/
│  │  ├─ index.md               # 书籍章程 + 章节地图
│  │  └─ ch00-setup.md
│  ├─ langchain/ go/ vibecoding/ js/ react/
│  └─ .vitepress/
│     ├─ config.mts             # 站点标题、导航、搜索
│     ├─ utils/books.ts         # 书单 —— 唯一真相来源
│     └─ theme/                 # 主题与首页书卡组件
└─ scripts/new-note.mjs         # 开当天的素材条
```

## 每天的三分钟

```bash
npm install          # 只第一次
npm run dev          # http://localhost:5173，边写边看

npm run note         # 建 notes/2026-11-09.md
```

素材条只填三格：**今天搞懂了什么 / 卡在哪 / 明天第一步**。不用追求文笔，代码和报错原样贴。

## 每周的半小时

同一主题的素材攒到 3～5 条，就合成一章 `docs/<书>/chNN-xxx.md`：

1. **给秩序**：按「为什么需要它 → 怎么工作 → 怎么用」重排
2. **补例子**：素材里通常只有结论，成书必须有能跑的代码 + 预期输出
3. **删废话**：一句结论如果找不到证据支撑，删掉

合并完在 frontmatter 里留个来源，方便回溯：

```yaml
---
title: 第 1 章 语法地基
order: 1
notes: notes/2026-11-09.md, notes/2026-11-11.md
---
```

## 加一本新书（两步，没有第三步）

1. `docs/.vitepress/utils/books.ts` 的 `BOOKS` 里加一行：

   ```ts
   { dir: 'rust', text: 'Rust 入门', tagline: '所有权 · 生命周期', status: 'planned' }
   ```

2. 建目录 `docs/rust/index.md`，写章节地图。

导航、侧边栏、首页卡片会自动出现。

## 发布

1. 仓库 Settings → Pages → Source 选 **GitHub Actions**。
2. push 到 `main`（改 `docs/**` 才会触发）。
3. 等 Action 跑完，访问 `https://<用户名>.github.io/<仓库名>/`。

工作流会自动把 `DOCS_BASE` 设成 `/<仓库名>/`；本地构建默认根路径 `/`，互不影响。

## 约定

- 章节文件名用 `chNN-英文短横线.md`，中文标题写在 frontmatter 的 `title` 里——网址干净，标题照样中文。
- 一章一个主题，超过 2000 字就考虑拆。
- 章节地图里的 ⬜ / 🚧 / ✅ 是给自己看的进度，不是给别人看的承诺。
