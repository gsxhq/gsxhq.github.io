import DefaultTheme from 'vitepress/theme'
import type { Theme } from 'vitepress'
import GsxPlayground from './GsxPlayground.vue'
import './playground.css'

// Extend the default theme so the existing nav/sidebar config still applies,
// and register the interactive playground component for use in markdown.
export default {
  extends: DefaultTheme,
  enhanceApp({ app, router }) {
    app.component('GsxPlayground', GsxPlayground)
    // Count SPA route changes in GoatCounter. The script (loaded via config
    // head with no_onload) exposes window.goatcounter; count() on each change.
    if (typeof window !== 'undefined') {
      router.onAfterRouteChanged = (to) => {
        // @ts-expect-error injected by count.js at runtime
        window.goatcounter?.count({ path: to })
      }
    }
  },
} satisfies Theme
