import { copyFileSync, mkdirSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { join, resolve } from 'node:path'
import { tmpdir } from 'node:os'
import { resolveGsxRepo } from './gsx-source.mjs'

const { root } = resolveGsxRepo()
const out = join(tmpdir(), 'gsx.wasm')
const publicDir = resolve('public')
const wasmDest = join(publicDir, 'gsx.wasm')

execFileSync('go', ['build', '-o', out, './playground/wasm'], {
  cwd: root,
  stdio: 'inherit',
  env: { ...process.env, GOOS: 'js', GOARCH: 'wasm' },
})

const goRoot = execFileSync('go', ['env', 'GOROOT'], { encoding: 'utf8' }).trim()
mkdirSync(publicDir, { recursive: true })
copyFileSync(out, wasmDest)
copyFileSync(join(goRoot, 'lib', 'wasm', 'wasm_exec.js'), join(publicDir, 'wasm_exec.js'))
console.log(`built playground wasm: ${root}/playground/wasm -> ${wasmDest}`)
