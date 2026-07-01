// Build-time fetch: bring gsx's docs/guide/** into ./guide so VitePress can render
// it. Source order: GSX_DOCS_SRC env > local sibling ../gsx > shallow git clone.
import { existsSync, rmSync, mkdirSync, cpSync, symlinkSync } from 'node:fs'
import { join, resolve, dirname } from 'node:path'
import { resolveGsxRepo } from './gsx-source.mjs'

const DEST = resolve('guide')
const link = process.argv.includes('--link')

// Returns { dir, local }: the docs/guide source dir, and whether it is a stable
// local path safe to symlink (vs a throwaway clone that must be copied).
function resolveSource() {
  const { root, local } = resolveGsxRepo()
  const dir = resolve(root, 'docs', 'guide')
  if (!existsSync(dir)) {
    throw new Error(`gsx source is missing docs/guide at ${dir}`)
  }
  return { dir, root, local }
}

const { dir: src, root: gsxRoot, local } = resolveSource()
rmSync(DEST, { recursive: true, force: true })

if (link && local) {
  mkdirSync(dirname(DEST), { recursive: true })
  symlinkSync(src, DEST, 'dir')
  console.log(`linked guide: ${DEST} -> ${src}`)
} else {
  mkdirSync(DEST, { recursive: true })
  cpSync(src, DEST, { recursive: true })
  console.log(`copied guide: ${src} -> ${DEST}`)
}

// Also sync the generated playground presets (single source of the example
// gallery) into the theme, so the dropdown matches the docs Examples page.
function syncPresets() {
  const jsonSrc = resolve(gsxRoot, 'docs', 'examples.json')
  const dest = resolve('.vitepress/theme/presets.generated.json')
  if (existsSync(jsonSrc)) {
    cpSync(jsonSrc, dest)
    console.log(`copied presets: ${jsonSrc} -> ${dest}`)
  } else {
    console.log('presets: no docs/examples.json source; keeping committed presets.generated.json')
  }
}
syncPresets()

// Sync the gsx TextMate grammar from the vscode-gsx extension (its canonical
// owner) so the site's Shiki highlighting stays identical to the editor's. The
// committed copy under .vitepress/grammars is the fallback when the sibling repo
// isn't checked out (e.g. CI building from a docs-only checkout).
function syncGrammar() {
  let grammarSrc
  if (process.env.GSX_GRAMMAR_SRC) {
    grammarSrc = resolve(process.env.GSX_GRAMMAR_SRC)
  } else {
    const sibling = resolve('..', 'vscode-gsx', 'syntaxes', 'gsx.tmLanguage.json')
    if (existsSync(sibling)) grammarSrc = sibling
  }
  const dest = resolve('.vitepress/grammars/gsx.tmLanguage.json')
  if (grammarSrc && existsSync(grammarSrc)) {
    cpSync(grammarSrc, dest)
    console.log(`copied grammar: ${grammarSrc} -> ${dest}`)
  } else {
    console.log('grammar: no vscode-gsx source; keeping committed gsx.tmLanguage.json')
  }
}
syncGrammar()
