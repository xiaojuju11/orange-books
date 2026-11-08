import DefaultTheme from 'vitepress/theme'
import BookShelf from './components/BookShelf.vue'
import './custom.css'

export default {
  extends: DefaultTheme,
  enhanceApp({ app }: { app: any }) {
    app.component('BookShelf', BookShelf)
  },
}
