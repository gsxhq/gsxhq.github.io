import { defineConfig } from 'vitepress'

// Project Pages live at https://gsxhq.github.io/website/ — switch base to '/' if a
// custom domain is added later.
export default defineConfig({
  title: 'gsx',
  description:
    'A templating language for Go — templ-style components, JSX-style markup, compiled to plain Go.',
  base: '/website/',
  markdown: {
    languageAlias: { gsx: 'jsx' },
  },
  themeConfig: {
    nav: [
      { text: 'Guide', link: '/guide/vision' },
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
          ],
        },
      ],
    },
    search: { provider: 'local' },
    socialLinks: [{ icon: 'github', link: 'https://github.com/gsxhq/gsx' }],
  },
})
