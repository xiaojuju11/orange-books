/**
 * 书单 —— 整个站点的唯一真相来源（纯数据，不含 node 内置模块）。
 * 加一本新书：这里加一行 + 建目录 docs/<dir>/index.md，导航、侧边栏、首页卡片会自动出现。
 * dir 同时是网址前缀。
 */
export interface Book {
  dir: string
  text: string
  tagline: string
  /** writing = 正在写；planned = 排队；done = 已完结 */
  status: 'writing' | 'planned' | 'done'
}

export const BOOKS: Book[] = [
  {
    dir: 'python',
    text: 'Python 上手到实战',
    tagline: '环境 · 语法 · 对象模型 · 工程化',
    status: 'writing',
  },
  {
    dir: 'langchain',
    text: 'LangChain 应用开发',
    tagline: '模型 · 工具调用 · Agent · RAG',
    status: 'planned',
  },
  {
    dir: 'go',
    text: 'Go 入门到并发实战',
    tagline: '语法 · 接口 · goroutine · 工程实践',
    status: 'planned',
  },
  {
    dir: 'vibecoding',
    text: 'Vibe Coding 实战',
    tagline: '用 AI 写代码的工程纪律',
    status: 'writing',
  },
  {
    dir: 'js',
    text: 'JavaScript 精讲',
    tagline: '语言机制 · 手写实现 · TypeScript',
    status: 'planned',
  },
  {
    dir: 'react',
    text: 'React 深度进阶',
    tagline: 'Hooks 原理 · 渲染机制 · 工程化',
    status: 'planned',
  },
]
