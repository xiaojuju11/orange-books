# 小橘书房

一橘一得：每天把学到的那一点写下来，攒成一本。**Markdown 写内容 → 静态站构建 → push 自动上线**。

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
│  ├─ index.md                  # 书库首页（书卡显示每本书的真实进度）
│  ├─ python/                   # 一本书 = 一个目录 = 网址前缀 /python/
│  │  ├─ index.md               # 书籍章程 + 章节地图
│  │  └─ ch00-setup.md
│  ├─ langchain/ go/ vibecoding/ js/ react/
│  └─ .vitepress/
│     ├─ config.mts             # 站点标题、导航、搜索、书卡进度注入
│     ├─ utils/book-list.ts     # 书单 —— 唯一真相来源（纯数据）
│     ├─ utils/books.ts         # 生成侧边栏，复用上面的书单
│     ├─ utils/doc-meta.ts      # 解析 frontmatter/H1/字数 —— 侧边栏与自检共用
│     └─ theme/                 # 主题与首页书卡组件
├─ scripts/
│  ├─ new-note.mjs              # 开当天的素材条
│  ├─ check-books.mjs           # 站内自检（npm run check）
│  └─ lib/book-checks.ts        # 自检规则，可被单测直接喂 fixture
└─ tests/                       # node --test，不引第三方测试框架
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

1. `docs/.vitepress/utils/book-list.ts` 的 `BOOKS` 里加一行：

   ```ts
   { dir: 'rust', text: 'Rust 入门', tagline: '所有权 · 生命周期', status: 'planned' }
   ```

2. 建目录 `docs/rust/index.md`，写章节地图。

导航、侧边栏、首页卡片会自动出现。

`books.ts` 不存书单：它只是从这里导入 `BOOKS`，扫描 `docs/<书>/` 生成侧边栏；加书只改 `book-list.ts`。

## 推送前的自检

```bash
npm run check        # 站内自检，有错退出码 1
npm test             # node --test，覆盖解析与自检规则
npm run verify       # 上面两个 + 构建，一次跑完
```

`npm run check` 查的是**构建拦不住、读者会踩到**的问题：

| 查什么 | 为什么 |
| --- | --- |
| 书目登记了、目录却不存在 | 首页书卡点进去是 404 |
| 章节地图漏了新章 / 指向已删的章 | 导读和实际目录对不上，读者找不到新内容 |
| 同一本书 order 重复或缺失 | 侧边栏顺序随机，每次构建都变 |
| `notes:` 指向不存在的素材 | 这章回溯不到原始笔记 |
| `notes/` 文件名与正文日期不一致 | 素材挂错天，复盘时对不上 |

有错误会让 push 上来的 Deploy 工作流直接红；警告只提示，不阻塞。

首页书卡上的「N 章 · X 万字 · 更新于 MM-DD」是构建时扫 `docs/` 真算出来的，不是手写。
`npm run dev` 下新增章节要重启 dev server 才会重新统计。

## 发布

1. 仓库 Settings → Pages → Source 选 **GitHub Actions**。
2. push 到 `main`（改 `docs/**`、`scripts/**`、`tests/**`、`package.json` 会触发）。
3. 等 Action 跑完，访问 `https://<用户名>.github.io/<仓库名>/`。

工作流会自动把 `DOCS_BASE` 设成 `/<仓库名>/`；本地构建默认根路径 `/`，互不影响。
自检与单测要直接读 `.ts`，本地和 CI 都要求 Node ≥ 22.18。

## 约定

- 章节文件名用 `chNN-英文短横线.md`，中文标题写在 frontmatter 的 `title` 里——网址干净，标题照样中文。
- 一章一个主题，超过 2000 字就考虑拆。
- 章节地图里的 ⬜ / 🚧 / ✅ 是给自己看的进度，不是给别人看的承诺。

## 写作规格

每章都按 [WRITING.md](WRITING.md) 的骨架写，面向 0 基础：

一句话结论 → 为什么需要它 → 术语翻译成大白话 → 最小可运行示例（逐行解释 + 实测输出）
→ 写错了会怎样（真实报错）→ 和 JS 对照（可选）→ 自测三问 → 下一步。
