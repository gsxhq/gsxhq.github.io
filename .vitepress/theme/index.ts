import DefaultTheme from 'vitepress/theme'
import type { Theme } from 'vitepress'
import GsxPlayground from './GsxPlayground.vue'
import './playground.css'

// Extend the default theme so the existing nav/sidebar config still applies,
// and register the interactive playground component for use in markdown.
export default {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    app.component('GsxPlayground', GsxPlayground)
  },
} satisfies Theme
