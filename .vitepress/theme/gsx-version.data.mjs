// Build-time data loader: the latest released gsx version, so the landing page
// never advertises a stale release. Releases are the v<major>.<minor>.<patch>
// tags on gsxhq/gsx; pre-release tags (v1.0.0-rc.1) are not advertised.
//
// Source order: the remote's tags (authoritative, and works against CI's shallow,
// tagless checkout) > tags in the local gsx checkout (offline dev).
import { execFileSync } from 'node:child_process'
import { resolveGsxRepo } from '../../scripts/gsx-source.mjs'

const GSX_REPO = 'https://github.com/gsxhq/gsx.git'
const RELEASE_TAG = /^v(\d+)\.(\d+)\.(\d+)$/

function remoteTags() {
  const out = execFileSync('git', ['ls-remote', '--tags', '--refs', GSX_REPO], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  return out
    .split('\n')
    .filter(Boolean)
    .map((line) => line.split('\t')[1].replace(/^refs\/tags\//, ''))
}

function localTags() {
  const { root } = resolveGsxRepo()
  const out = execFileSync('git', ['-C', root, 'tag', '--list', 'v*'], { encoding: 'utf8' })
  return out.split('\n').filter(Boolean)
}

function latestRelease(tags) {
  const releases = tags
    .map((tag) => tag.match(RELEASE_TAG))
    .filter(Boolean)
    .map((m) => ({ tag: m[0], parts: m.slice(1).map(Number) }))
  releases.sort((a, b) => b.parts[0] - a.parts[0] || b.parts[1] - a.parts[1] || b.parts[2] - a.parts[2])
  return releases[0]?.tag
}

export default {
  load() {
    let version
    try {
      version = latestRelease(remoteTags())
    } catch (err) {
      console.warn(`gsx-version: git ls-remote failed (${err.message.split('\n')[0]}); using local gsx tags`)
    }
    version ??= latestRelease(localTags())
    if (!version) {
      throw new Error('gsx-version: no v<major>.<minor>.<patch> release tag found for gsxhq/gsx')
    }
    return { version }
  },
}
