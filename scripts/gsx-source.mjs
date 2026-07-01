import { existsSync, mkdtempSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { join, resolve } from 'node:path'
import { tmpdir } from 'node:os'

const GSX_REPO = 'https://github.com/gsxhq/gsx.git'

export function resolveGsxRepo() {
  if (process.env.GSX_DOCS_SRC) {
    const root = resolve(process.env.GSX_DOCS_SRC)
    if (!existsSync(root)) {
      throw new Error(`GSX_DOCS_SRC is set but ${root} does not exist`)
    }
    return { root, local: true }
  }

  const sibling = resolve('..', 'gsx')
  if (existsSync(join(sibling, 'go.mod')) && existsSync(join(sibling, 'docs', 'guide'))) {
    return { root: sibling, local: true }
  }

  const root = mkdtempSync(join(tmpdir(), 'gsx-docs-'))
  execFileSync('git', ['clone', '--depth', '1', GSX_REPO, root], { stdio: 'inherit' })
  return { root, local: false }
}
