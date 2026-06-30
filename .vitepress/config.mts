import { defineConfig } from 'vitepress'
import gsxGrammar from './grammars/gsx.tmLanguage.json'
// gsx's grammar embeds Go/JS/CSS; VitePress only lazy-loads languages referenced
// by a fence, so the embedded bases must be registered explicitly.
import goLang from '@shikijs/langs/go'
import jsLang from '@shikijs/langs/javascript'
import cssLang from '@shikijs/langs/css'

// Org Pages site served at the root: https://gsxhq.github.io/ (repo is named
// gsxhq.github.io), so base is '/'.
export default defineConfig({
  title: 'gsx',
  description:
    'A templating language for Go — templ-style components, JSX-style markup, compiled to plain Go.',
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
    ['meta', { property: 'og:title', content: 'gsx — HTML as a first-class Go value' }],
    ['meta', { property: 'og:image', content: 'https://gsxhq.github.io/gsx-og.png' }],
    ['meta', { name: 'twitter:card', content: 'summary_large_image' }],
    ['meta', { name: 'twitter:image', content: 'https://gsxhq.github.io/gsx-og.png' }],
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
      { text: 'Guide', link: '/guide/getting-started' },
      { text: 'Playground', link: '/playground' },
    ],
    sidebar: {
      '/guide/': [
        {
          text: 'Guide',
          items: [
            { text: 'Getting started', link: '/guide/getting-started' },
            { text: 'Why gsx', link: '/guide/vision' },
            { text: 'Principles', link: '/guide/principles' },
            { text: 'Performance', link: '/guide/performance' },
            { text: 'Syntax', link: '/guide/syntax' },
            { text: 'Configuration', link: '/guide/config' },
            { text: 'Extensions', link: '/guide/extensions' },
            { text: 'CLI', link: '/guide/cli' },
            { text: 'Editor support', link: '/guide/editor' },
          ],
        },
        {
          text: 'Syntax and usage',
          items: [
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
            { text: 'Standard functions', link: '/guide/syntax/std-functions' },
            { text: 'Interop', link: '/guide/syntax/interop' },
            { text: 'Render once', link: '/guide/syntax/render-once' },
            { text: 'Forms', link: '/guide/syntax/forms' },
          ],
        },
      ],
    },
    search: { provider: 'local' },
    socialLinks: [{ icon: 'github', link: 'https://github.com/gsxhq/gsx' }],
  },
})
