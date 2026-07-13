import { defineConfig } from 'vitepress'
import gsxGrammar from './grammars/gsx.tmLanguage.json'
// gsx's grammar embeds Go/JS/CSS; VitePress only lazy-loads languages referenced
// by a fence, so the embedded bases must be registered explicitly.
import goLang from '@shikijs/langs/go'
import jsLang from '@shikijs/langs/javascript'
import cssLang from '@shikijs/langs/css'

const positioning = 'gsx — JSX-style HTML, compiled to plain Go.'

// Org Pages site served at the root: https://gsxhq.github.io/ (repo is named
// gsxhq.github.io), so base is '/'.
export default defineConfig({
  title: 'gsx',
  description: positioning,
  base: '/',
  head: [
    ['link', { rel: 'preconnect', href: 'https://fonts.googleapis.com' }],
    ['link', { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' }],
    [
      'link',
      {
        rel: 'stylesheet',
        href: 'https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=IBM+Plex+Sans:wght@400;500;600;700&display=swap',
      },
    ],
    // Favicons (served from public/).
    ['link', { rel: 'icon', type: 'image/svg+xml', href: '/gsx-favicon.svg' }],
    ['link', { rel: 'icon', type: 'image/png', sizes: '32x32', href: '/gsx-favicon-32.png' }],
    ['link', { rel: 'icon', type: 'image/png', sizes: '16x16', href: '/gsx-favicon-16.png' }],
    ['link', { rel: 'apple-touch-icon', sizes: '180x180', href: '/gsx-favicon-180.png' }],
    // Social / Open Graph preview.
    ['meta', { property: 'og:type', content: 'website' }],
    ['meta', { property: 'og:title', content: positioning }],
    ['meta', { property: 'og:image', content: 'https://gsxhq.github.io/gsx-og.png' }],
    ['meta', { name: 'twitter:card', content: 'summary_large_image' }],
    ['meta', { name: 'twitter:image', content: 'https://gsxhq.github.io/gsx-og.png' }],
    // GoatCounter analytics. no_onload defers counting to the theme's router
    // hook so SPA route changes are counted (not just the first page load).
    [
      'script',
      {
        'data-goatcounter': 'https://gsxhq.goatcounter.com/count',
        'data-goatcounter-settings': '{"no_onload":true}',
        async: '',
        src: 'https://gc.zgo.at/count.js',
      },
    ],
  ],
  // In CI the gsx repo is checked out into ./_gsx; exclude it (and the repo's own
  // README) so VitePress only builds index.md + the synced guide/ pages — not the
  // internal specs/plans/skill, which contain `{ }`/`{{ }}` that break Vue parsing.
  srcExclude: ['_gsx/**', 'README.md', 'guide/**/_generated/**'],
  markdown: {
    // Highlight ```gsx fences with the real gsx TextMate grammar (synced from
    // the vscode-gsx extension), not a jsx approximation. The grammar embeds
    // Go/JS/CSS, so those bundled languages must load alongside it.
    languages: [
      ...goLang,
      ...jsLang,
      ...cssLang,
      {
        ...gsxGrammar,
        embeddedLangs: ['go', 'javascript', 'css'],
      },
    ],
  },
  themeConfig: {
    // The { gsx } wordmark replaces the text title in the nav (light/dark variants).
    logo: { light: '/gsx-logo.svg', dark: '/gsx-logo-dark.svg', alt: 'gsx' },
    siteTitle: false,
    nav: [
      { text: 'Start', link: '/guide/getting-started' },
      { text: 'Learn', link: '/guide/learn' },
      { text: 'Reference', link: '/guide/syntax', activeMatch: '^/guide/syntax' },
      { text: 'Playground', link: '/playground' },
    ],
    sidebar: {
      '/guide/': [
        {
          text: 'Start',
          items: [
            { text: 'Getting started', link: '/guide/getting-started' },
            { text: 'Learn gsx', link: '/guide/learn' },
            { text: 'Why gsx', link: '/guide/vision' },
            { text: 'Principles', link: '/guide/principles' },
          ],
        },
        {
          text: 'Reference',
          items: [
            { text: 'Syntax reference', link: '/guide/syntax' },
            { text: 'Basic syntax', link: '/guide/syntax/basic-syntax' },
            { text: 'Raw Go', link: '/guide/syntax/raw-go' },
            { text: 'Elements', link: '/guide/syntax/elements' },
            { text: 'Comments', link: '/guide/syntax/comments' },
            { text: 'Fragments', link: '/guide/syntax/fragments' },
            { text: 'Interpolation & expressions', link: '/guide/syntax/interpolation' },
            { text: 'Attributes', link: '/guide/syntax/attributes' },
            { text: 'Control flow', link: '/guide/syntax/control-flow' },
            { text: 'Components & composition', link: '/guide/syntax/composition' },
            { text: 'Props model', link: '/guide/syntax/props' },
            { text: 'Styling', link: '/guide/syntax/styling' },
            { text: 'JavaScript & scripts', link: '/guide/syntax/javascript' },
            { text: 'Pipelines & filters', link: '/guide/syntax/pipelines' },
            { text: 'Rendering raw HTML', link: '/guide/syntax/raw-html' },
            { text: 'Security & escaping', link: '/guide/syntax/escaping' },
            { text: 'Context', link: '/guide/syntax/context' },
            { text: 'Runtime helpers', link: '/guide/syntax/std-functions' },
            { text: 'Forms', link: '/guide/syntax/forms' },
          ],
        },
        {
          text: 'Tooling',
          items: [
            { text: 'CLI', link: '/guide/cli' },
            { text: 'Dev loop', link: '/guide/dev-loop' },
            { text: 'Configuration', link: '/guide/config' },
            { text: 'Extensions', link: '/guide/extensions' },
            { text: 'Editor support', link: '/guide/editor' },
            { text: 'Performance', link: '/guide/performance' },
          ],
        },
        {
          text: 'Patterns',
          items: [
            { text: 'Overview', link: '/guide/patterns' },
            { text: 'Render once', link: '/guide/patterns/render-once' },
          ],
        },
        {
          text: 'Project',
          items: [
            { text: 'Status', link: '/guide/status' },
            { text: 'Comparisons', link: '/guide/comparisons' },
            { text: 'Interop', link: '/guide/syntax/interop' },
          ],
        },
      ],
    },
    search: { provider: 'local' },
    socialLinks: [{ icon: 'github', link: 'https://github.com/gsxhq/gsx' }],
  },
})
