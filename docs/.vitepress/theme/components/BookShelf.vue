<script setup lang="ts">
import { withBase } from 'vitepress'
import { BOOKS } from '../../utils/book-list'

const LABEL: Record<string, string> = {
  writing: '正在更新',
  planned: '排队中',
  done: '已完结',
}
</script>

<template>
  <div class="books-grid">
    <a v-for="book in BOOKS" :key="book.dir" class="book-card" :href="withBase(`/${book.dir}/`)">
      <span class="book-status" :class="book.status">{{ LABEL[book.status] }}</span>
      <h3>{{ book.text }}</h3>
      <p>{{ book.tagline }}</p>
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
  display: block;
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

.book-status {
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
