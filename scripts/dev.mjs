import { spawn } from 'node:child_process'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { resolveGsxRepo } from './gsx-source.mjs'

const playgroundURL = process.env.VITE_GSX_PLAYGROUND_API ?? 'http://localhost:8088'
const { root: gsxRoot } = resolveGsxRepo()
const playgroundServer = join(tmpdir(), `gsxplayground-${process.pid}`)
const children = new Set()
let shuttingDown = false

function runStep(command, args, options = {}) {
  const child = spawn(command, args, { stdio: 'inherit', ...options })
  return new Promise((resolve, reject) => {
    child.on('error', reject)
    child.on('exit', (code, signal) => {
      if (code === 0) {
        resolve()
        return
      }
      reject(new Error(`${command} ${args.join(' ')} exited with ${signal ?? code}`))
    })
  })
}

function start(command, args, options = {}) {
  const child = spawn(command, args, { stdio: 'inherit', ...options })
  children.add(child)
  child.on('exit', (code, signal) => {
    children.delete(child)
    if (shuttingDown) return
    shutdown(code === null ? 1 : code, `${command} ${args.join(' ')} exited with ${signal ?? code}`)
  })
  child.on('error', (err) => {
    if (shuttingDown) return
    shutdown(1, `${command} ${args.join(' ')} failed: ${err.message}`)
  })
  return child
}

function shutdown(code = 0, message = '') {
  shuttingDown = true
  if (message) console.error(message)
  for (const child of children) {
    if (!child.killed) child.kill('SIGINT')
  }
  setTimeout(() => process.exit(code), 250)
}

process.on('SIGINT', () => shutdown(130))
process.on('SIGTERM', () => shutdown(143))

await runStep('node', ['scripts/sync-docs.mjs'])
await runStep('node', ['scripts/build-playground-wasm.mjs'])
await runStep('go', ['build', '-o', playgroundServer, '.'], {
  cwd: `${gsxRoot}/playground/server`,
})

start(playgroundServer, ['-addr', ':8088', '-gsxmod', gsxRoot])
start('npx', ['vitepress', 'dev'], {
  env: {
    ...process.env,
    VITE_GSX_PLAYGROUND_API: playgroundURL,
  },
})
