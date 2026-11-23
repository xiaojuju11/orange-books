<script setup lang="ts">
import { withBase } from 'vitepress'
import { BOOKS } from '../../utils/book-list'
import type { Book } from '../../utils/book-list'

// 由 config.mts 的 vite.define 注入：构建时扫 docs/ 算好的真实进度（已格式化成字符串）
interface ShelfStats {
  chapters: number
  words: string
  updatedAt: string
}

declare const __BOOK_STATS__: Record<string, ShelfStats>

// 用 Book['status'] 约束键：新增状态时必须补标签，避免书卡徽章空白
const LABEL: Record<Book['status'], string> = {
  writing: '正在更新',
  planned: '排队中',
  done: '已完结',
}

const stats: Record<string, ShelfStats> =
  typeof __BOOK_STATS__ === 'undefined' ? {} : __BOOK_STATS__

function statOf(dir: string): ShelfStats {
  return stats[dir] || { chapters: 0, words: '', updatedAt: '' }
}
</script>

<template>
  <div class="books-grid">
    <a v-for="book in BOOKS" :key="book.dir" class="book-card" :href="withBase(`/${book.dir}/`)">
      <span class="book-status" :class="book.status">{{ LABEL[book.status] }}</span>
      <h3>{{ book.text }}</h3>
      <p>{{ book.tagline }}</p>
      <p v-if="statOf(book.dir).chapters" class="book-progress">
        {{ statOf(book.dir).chapters }} 章 · {{ statOf(book.dir).words }}
        <span class="book-progress-sep">·</span>
        更新于 {{ statOf(book.dir).updatedAt }}
      </p>
      <p v-else class="book-progress book-progress-empty">还没动笔</p>
    </a>
  </div>
</template>

<style scoped>
.books-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(230px, 1fr));
  gap: 16px;
  margin: 28px 0 8px;
}

.book-card {
  position: relative;
  /* 竖向 flex + 进度行 margin-top:auto：同一行书卡的分割线才能对齐，
     不会因为标签行数不同而高低错落 */
  display: flex;
  flex-direction: column;
  padding: 20px 22px 18px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 14px;
  background: var(--vp-c-bg-soft);
  text-decoration: none !important;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.02);
  transition: border-color 0.2s ease, transform 0.2s ease, box-shadow 0.2s ease;
}

.book-card:hover {
  border-color: var(--vp-c-brand-2);
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(234, 106, 44, 0.08);
}

.book-card:focus-visible {
  outline: 2px solid var(--vp-c-brand-2);
  outline-offset: 3px;
}

.book-card h3 {
  margin: 0 0 6px;
  font-size: 16.5px;
  font-weight: 600;
  color: var(--vp-c-text-1);
  line-height: 1.4;
  letter-spacing: -0.01em;
}

.book-card p {
  margin: 0;
  font-size: 13.5px;
  line-height: 1.6;
  color: var(--vp-c-text-2);
}

/* 简介和分割线之间留口气；进度行自己靠 margin-top:auto 吸底，不受这条影响 */
.book-card p:not(.book-progress) {
  margin-bottom: 14px;
}

/* 进度行：一条细分割线就够了，不加底色，免得书卡变成仪表盘 */
.book-progress {
  margin-top: auto !important;
  padding-top: 10px;
  border-top: 1px solid var(--vp-c-divider);
  font-size: 12.5px !important;
  color: var(--vp-c-text-3) !important;
  font-variant-numeric: tabular-nums;
}

.book-progress-sep {
  margin: 0 2px;
  color: var(--vp-c-divider);
}

.book-progress-empty {
  opacity: 0.7;
}

.book-status {
  /* 父级是 flex 列，不写 align-self 的话徽章会被拉成整行宽的胶囊 */
  align-self: flex-start;
  display: inline-block;
  margin-bottom: 10px;
  padding: 2px 9px;
  font-size: 11.5px;
  font-weight: 500;
  border-radius: 999px;
  letter-spacing: 0.02em;
}

.book-status.writing {
  background: var(--vp-c-brand-soft);
  color: var(--vp-c-brand-1);
}

.book-status.planned {
  background: var(--vp-c-default-soft);
  color: var(--vp-c-text-2);
}

.book-status.done {
  background: var(--vp-c-tip-soft);
  color: var(--vp-c-tip-1);
}
</style>
