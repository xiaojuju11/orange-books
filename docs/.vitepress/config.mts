import { defineConfig } from 'vitepress'
import { BOOKS, buildBookStats, buildSidebars } from './utils/books'
import { formatDay, formatWords } from './utils/doc-meta'

// 构建时扫一遍 docs/，把每本书的真实进度（章节数、字数、最近更新）注入客户端，
// 首页书卡直接用，不额外发请求。数字在这里就格式化成字符串，客户端不必再引 node 相关的模块。
// 注意：新增章节后 dev 需要重启，才会重新统计。
const BOOK_STATS = Object.fromEntries(
  Object.entries(buildBookStats()).map(([dir, s]) => [
    dir,
    { chapters: s.chapters, words: formatWords(s.words), updatedAt: formatDay(s.updatedAt) },
  ]),
)

export default defineConfig({
  lang: 'zh-CN',
  title: '小橘书房',
  description: '把每天学的东西，写成一本本可以读完的书',
  // 部署到 GitHub Pages 时由工作流注入 /仓库名/，本地开发默认根路径
  base: process.env.DOCS_BASE || '/',
  cleanUrls: true,
  lastUpdated: true,

  vite: {
    define: {
      __BOOK_STATS__: JSON.stringify(BOOK_STATS),
    },
  },

  head: [
    ['link', { rel: 'icon', type: 'image/svg+xml', href: '/logo.svg' }],
  ],

  markdown: {
    lineNumbers: true,
  },

  themeConfig: {
    logo: '/logo.svg',

    nav: [
      { text: '首页', link: '/' },
      {
        text: '书目',
        items: BOOKS.map((book) => ({ text: book.text, link: `/${book.dir}/` })),
      },
    ],

    sidebar: buildSidebars(),

    outline: { level: [2, 3], label: '本页目录' },
    docFooter: { prev: '上一章', next: '下一章' },
    returnToTopLabel: '回到顶部',
    sidebarMenuLabel: '目录',
    darkModeSwitchLabel: '主题',
    lightModeSwitchTitle: '切换到浅色模式',
    darkModeSwitchTitle: '切换到深色模式',
    externalLinkIcon: true,
    lastUpdated: { text: '最后更新' },

    search: {
      provider: 'local',
      options: {
        translations: {
          button: { buttonText: '搜索全书', buttonAriaLabel: '搜索全书' },
          modal: {
            noResultsText: '没有找到相关内容',
            resetButtonTitle: '清空搜索',
            footer: {
              selectText: '选择',
              navigateText: '切换',
              closeText: '关闭',
            },
          },
        },
      },
    },

    socialLinks: [
      { icon: 'github', link: 'https://github.com/xiaojuju11' },
    ],

    footer: {
      message: '小橘书房 · 每天一点，写成一本。',
      copyright: '仅用于个人学习记录',
    },
  },
})
