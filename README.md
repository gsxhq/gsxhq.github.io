# gsxhq.github.io

The documentation site for [gsx](https://github.com/gsxhq/gsx), built with
[VitePress](https://vitepress.dev) and deployed to GitHub Pages at
<https://gsxhq.github.io/>.

## How content works

The guide pages are **authored in the gsx repo** under `docs/guide/` and pulled in
at build time by `scripts/sync-docs.mjs`. Do not edit `guide/` here — it is
generated and gitignored. Edit the Markdown in `gsxhq/gsx` instead.

Source resolution order for the sync: `GSX_DOCS_SRC` env → local sibling `../gsx` →
shallow `git clone`.

## Develop

```bash
npm install
npm run dev      # syncs ../gsx/docs/guide, builds WASM, then starts both servers
```

After editing `../gsx/docs/guide/*.md`, restart `npm run dev` or run `npm run sync`
to refresh the copied guide pages.

`npm run dev` also starts the sibling playground backend from
`../gsx/playground/server` on `http://localhost:8088`, matching the frontend's
local API URL.

## Build

```bash
npm run build    # copies guide content, then builds to .vitepress/dist
npm run preview
```
