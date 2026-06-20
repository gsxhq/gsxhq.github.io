# gsxhq/website

The documentation site for [gsx](https://github.com/gsxhq/gsx), built with
[VitePress](https://vitepress.dev) and deployed to GitHub Pages.

## How content works

The guide pages are **authored in the gsx repo** under `docs/guide/` and pulled in
at build time by `scripts/sync-docs.mjs`. Do not edit `guide/` here — it is
generated and gitignored. Edit the Markdown in `gsxhq/gsx` instead.

Source resolution order for the sync: `GSX_DOCS_SRC` env → local sibling `../gsx` →
shallow `git clone`.

## Develop

```bash
npm install
npm run dev      # symlinks ../gsx/docs/guide for live reload, then serves
```

Edits to `../gsx/docs/guide/*.md` hot-reload in the dev server.

## Build

```bash
npm run build    # copies guide content, then builds to .vitepress/dist
npm run preview
```
