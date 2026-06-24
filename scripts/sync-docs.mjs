// Build-time fetch: bring gsx's docs/guide/** into ./guide so VitePress can render
// it. Source order: GSX_DOCS_SRC env > local sibling ../gsx > shallow git clone.
import { existsSync, rmSync, mkdirSync, cpSync, symlinkSync, mkdtempSync } from 'node:fs'
import { join, resolve, dirname } from 'node:path'
import { execFileSync } from 'node:child_process'
import { tmpdir } from 'node:os'

const GSX_REPO = 'https://github.com/gsxhq/gsx.git'
const DEST = resolve('guide')
const link = process.argv.includes('--link')

// Returns { dir, local }: the docs/guide source dir, and whether it is a stable
// local path safe to symlink (vs a throwaway clone that must be copied).
function resolveSource() {
  if (process.env.GSX_DOCS_SRC) {
    const dir = resolve(process.env.GSX_DOCS_SRC, 'docs', 'guide')
    if (!existsSync(dir)) {
      throw new Error(`GSX_DOCS_SRC is set but ${dir} does not exist`)
    }
    return { dir, local: true }
  }
  const sibling = resolve('..', 'gsx', 'docs', 'guide')
  if (existsSync(sibling)) return { dir: sibling, local: true }

  const tmp = mkdtempSync(join(tmpdir(), 'gsx-docs-'))
  execFileSync('git', ['clone', '--depth', '1', GSX_REPO, tmp], { stdio: 'inherit' })
  return { dir: resolve(tmp, 'docs', 'guide'), local: false }
}

const { dir: src, local } = resolveSource()
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
  let jsonSrc
  if (process.env.GSX_DOCS_SRC) {
    jsonSrc = resolve(process.env.GSX_DOCS_SRC, 'docs', 'examples.json')
  } else {
    const sibling = resolve('..', 'gsx', 'docs', 'examples.json')
    if (existsSync(sibling)) jsonSrc = sibling
  }
  const dest = resolve('.vitepress/theme/presets.generated.json')
  if (jsonSrc && existsSync(jsonSrc)) {
    cpSync(jsonSrc, dest)
    console.log(`copied presets: ${jsonSrc} -> ${dest}`)
  } else {
    console.log('presets: no docs/examples.json source; keeping committed presets.generated.json')
  }
}
syncPresets()
