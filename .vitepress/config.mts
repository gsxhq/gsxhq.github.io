import { defineConfig } from 'vitepress'

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
  ],
  // In CI the gsx repo is checked out into ./_gsx; exclude it (and the repo's own
  // README) so VitePress only builds index.md + the synced guide/ pages — not the
  // internal specs/plans/skill, which contain `{ }`/`{{ }}` that break Vue parsing.
  srcExclude: ['_gsx/**', 'README.md'],
  markdown: {
    languageAlias: { gsx: 'jsx' },
  },
  themeConfig: {
    nav: [
      { text: 'Guide', link: '/guide/vision' },
      { text: 'Playground', link: '/playground' },
      { text: 'Examples', link: 'https://github.com/gsxhq/gsx/tree/main/examples' },
      { text: 'Roadmap', link: 'https://github.com/gsxhq/gsx/blob/main/docs/ROADMAP.md' },
    ],
    sidebar: {
      '/guide/': [
        {
          text: 'Guide',
          items: [
            { text: 'Why gsx', link: '/guide/vision' },
            { text: 'Principles', link: '/guide/principles' },
            { text: 'Syntax', link: '/guide/syntax' },
            { text: 'CLI', link: '/guide/cli' },
          ],
        },
      ],
    },
    search: { provider: 'local' },
    socialLinks: [{ icon: 'github', link: 'https://github.com/gsxhq/gsx' }],
  },
})
