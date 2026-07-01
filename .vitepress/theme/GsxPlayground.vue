<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import { useData } from 'vitepress'
import hljs from 'highlight.js/lib/core'
import goLang from 'highlight.js/lib/languages/go'
import xmlLang from 'highlight.js/lib/languages/xml'
import generatedPresets from './presets.generated.json'
hljs.registerLanguage('go', goLang)
hljs.registerLanguage('xml', xmlLang)

// Follows the VitePress light/dark toggle (sets .dark on <html>).
const { isDark } = useData()

// The interactive loop runs client-side: a Go-compiled WASM module (gsx repo's
// playground/wasm) exposes gsxTransform(source) -> {files, diagnostics} and
// gsxFormat(source). The HTML PREVIEW alone is rendered by the server's /run
// (a real Go compiler — needed for component composition), called only on Run.
const base = (import.meta as any).env?.BASE_URL ?? '/'
const API =
  (import.meta as any).env?.VITE_GSX_PLAYGROUND_API ?? 'http://localhost:8088'

let wasmPromise: Promise<void> | null = null
function ensureWasm(): Promise<void> {
  if (wasmPromise) return wasmPromise
  wasmPromise = (async () => {
    if (!(window as any).Go) {
      await new Promise<void>((resolve, reject) => {
        const s = document.createElement('script')
        s.src = `${base}wasm_exec.js`
        s.onload = () => resolve()
        s.onerror = () => reject(new Error('failed to load wasm_exec.js'))
        document.head.appendChild(s)
      })
    }
    const go = new (window as any).Go()
    // Content-hashed at build time (VITE_GSX_WASM=gsx.<hash>.wasm) so a new
    // version is a new URL — cache invalidation across deploys just works.
    const wasmFile = (import.meta as any).env?.VITE_GSX_WASM ?? 'gsx.wasm'
    const isDev = Boolean((import.meta as any).hot)
    const wasmURL = `${base}${wasmFile}${isDev ? `?t=${Date.now()}` : ''}`
    const bytes = await (await fetch(wasmURL, isDev ? { cache: 'no-store' } : undefined)).arrayBuffer()
    const result = await WebAssembly.instantiate(bytes, go.importObject)
    // go.run never resolves (the module blocks); it signals readiness via gsxReady.
    await new Promise<void>((resolve) => {
      ;(window as any).gsxReady = () => resolve()
      go.run(result.instance)
    })
  })()
  return wasmPromise
}

// Example presets are generated from the single-source examples/*.txtar fixtures
// (see the gsx repo internal/examplegen). The docs Examples page, this dropdown,
// and the backend cache-seed all come from the same source — no drift.
const presets = generatedPresets as { name: string; category?: string; source: string; invoke: string }[]

const presetIdx = ref(0)
const source = ref(presets[0].source)
const invoke = ref(presets[0].invoke)

const html = ref('')
const generatedGo = ref('')
const diagnostics = ref<
  {
    severity: string
    code?: string
    message: string
    help?: string
    line: number
    column: number
  }[]
>([])
const error = ref('')
const ms = ref(0)
const loading = ref(false)
// Diagnostics + Generated Go always update live (in-browser WASM). This toggle
// only controls the HTML PREVIEW, which is a server /run call — off by default
// so it fires on Run, not every keystroke.
const autorun = ref(false)
const activeTab = ref<'preview' | 'html' | 'go' | 'problems'>('preview')
const split = ref(50)
const dragging = ref(false)
const shared = ref(false)

// Track what was last rendered so we can show an "edited — press Run" cue in
// manual mode without a watcher race on preset switches.
const lastSource = ref('')
const lastInvoke = ref('')
const dirty = computed(
  () =>
    !autorun.value &&
    (source.value !== lastSource.value || invoke.value !== lastInvoke.value),
)

const hasErrors = computed(() =>
  diagnostics.value.some((d) => d.severity === 'error'),
)

// Syntax-highlighted output for the HTML and Generated-Go tabs (read-only).
// hljs escapes its input, so v-html-ing the result is safe.
const htmlHi = computed(() =>
  html.value ? hljs.highlight(html.value, { language: 'xml' }).value : '',
)
const goHi = computed(() =>
  generatedGo.value ? hljs.highlight(generatedGo.value, { language: 'go' }).value : '',
)

const tabs = [
  { id: 'preview', label: 'Preview' },
  { id: 'html', label: 'HTML' },
  { id: 'go', label: 'Generated Go' },
  { id: 'problems', label: 'Problems' },
] as const

// Wrap the rendered HTML with minimal base styling so the preview reads like a
// real page rather than unstyled text.
const srcdoc = computed(
  () =>
    `<!doctype html><html><head><meta charset="utf-8"><style>
      :root{color-scheme:light}
      body{font:15px/1.5 'IBM Plex Sans',system-ui,sans-serif;margin:0;padding:24px;color:#1c2128}
      .card{border:1px solid #e3e8ee;border-radius:12px;padding:16px;max-width:360px}
      .badge{display:inline-block;background:#00ADD8;color:#04222b;font-weight:600;border-radius:999px;padding:2px 10px}
      .tag{display:inline-block;border:1px solid #cfd6df;border-radius:999px;padding:3px 12px}
      .tag--active{background:#00ADD8;border-color:#00ADD8;color:#04222b;font-weight:600}
      blockquote{border-left:3px solid #00ADD8;margin:0;padding:6px 14px;color:#3a4350}
    </style></head><body>${html.value}</body></html>`,
)

// ---- transform (live, in-browser) + render (preview, server) ------------
let timer: any
let seq = 0
let lastFiles: any[] = []

// On every edit: run the in-browser WASM transform (instant, free) to refresh
// diagnostics and Generated Go. Optionally also refresh the server-rendered
// preview when auto-run is on.
function scheduleRender() {
  if (timer) clearTimeout(timer)
  timer = setTimeout(async () => {
    await liveTransform()
    if (autorun.value) render()
  }, 250)
}

// liveTransform runs the WASM transform only: generated Go + diagnostics. No
// network. lastFiles is reused by render() so it doesn't re-transform.
async function liveTransform(): Promise<boolean> {
  await ensureWasm()
  const data = (window as any).gsxTransform(source.value)
  const files = (data.files ?? []) as { name: string; code: string }[]
  lastFiles = files
  diagnostics.value = data.diagnostics ?? []
  generatedGo.value = files
    .map((f) => (files.length > 1 ? `// ${f.name}\n${f.code}` : f.code))
    .join('\n\n')
  return !hasErrors.value
}

// render refreshes the HTML preview by compiling+running the generated Go on the
// server (/run) — a real Go compiler, needed for component composition.
async function render() {
  const mine = ++seq
  lastSource.value = source.value
  lastInvoke.value = invoke.value
  loading.value = true
  error.value = ''
  try {
    const ok = await liveTransform()
    if (mine !== seq) return
    if (!ok) {
      html.value = ''
      activeTab.value = 'problems'
      return
    }
    const res = await fetch(`${API}/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ files: lastFiles, invoke: invoke.value }),
    })
    if (mine !== seq) return
    const data = await res.json()
    html.value = data.html ?? ''
    ms.value = data.ms ?? 0
    if (data.error) {
      error.value = data.error
      activeTab.value = 'problems'
    } else if (activeTab.value === 'problems') {
      activeTab.value = 'preview'
    }
  } catch {
    if (mine !== seq) return
    error.value = `Could not reach the render service at ${API} — is the playground server running?`
    activeTab.value = 'problems'
  } finally {
    if (mine === seq) loading.value = false
  }
}

function loadPreset() {
  if (presetIdx.value < 0) return // "Shared link" entry — keep current content
  const p = presets[presetIdx.value]
  source.value = p.source
  invoke.value = p.invoke
  setEditorDoc(p.source)
  render()
}

// ---- format -------------------------------------------------------------
// Formats the component via /format (same as `gsx fmt`) and replaces the editor
// content. Returns the raw response ({formatted} or {error}).
async function format() {
  try {
    await ensureWasm()
    const data = (window as any).gsxFormat(source.value)
    if (typeof data.formatted === 'string') setEditorDoc(data.formatted)
    return data
  } catch (e) {
    return { error: `format: ${e}` }
  }
}

// Format button: format-only, surfacing a parse/print failure as a diagnostic.
function onFormat() {
  format().then((d) => {
    if (d && d.error) {
      error.value = 'format: ' + d.error
      diagnostics.value = []
      activeTab.value = 'problems'
    }
  })
}

// Run / Cmd-Ctrl+Enter: format-on-run, then render. A format failure leaves the
// editor untouched and stops before render.
async function formatAndRun() {
  const data = await format()
  if (data && data.error) {
    error.value = 'format: ' + data.error
    diagnostics.value = []
    activeTab.value = 'problems'
    return
  }
  render()
}

function runShortcut(e: KeyboardEvent) {
  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
    e.preventDefault()
    formatAndRun()
  }
}

// ---- shareable URL ------------------------------------------------------
// State is encoded into the URL hash (#try=<base64>) so a link reproduces the
// exact component + entry point. Hash keeps it fully client-side (static site).
function b64encode(str: string): string {
  const bytes = new TextEncoder().encode(str)
  let bin = ''
  bytes.forEach((b) => (bin += String.fromCharCode(b)))
  return btoa(bin)
}
function b64decode(b64: string): string {
  const bin = atob(b64)
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0))
  return new TextDecoder().decode(bytes)
}
function loadFromHash(): boolean {
  const m = location.hash.match(/[#&]try=([^&]+)/)
  if (!m) return false
  try {
    const o = JSON.parse(b64decode(decodeURIComponent(m[1])))
    if (typeof o.s === 'string') source.value = o.s
    if (typeof o.i === 'string') invoke.value = o.i
    // Sync the dropdown: an "Open in Playground" link carries a preset's exact
    // source+invoke, so select it; otherwise show the "Shared link" entry (-1).
    presetIdx.value = presets.findIndex(
      (p) => p.source === source.value && p.invoke === invoke.value,
    )
    return true
  } catch {
    return false
  }
}
async function share() {
  const payload = b64encode(JSON.stringify({ s: source.value, i: invoke.value }))
  const url = `${location.origin}${location.pathname}#try=${payload}`
  history.replaceState(null, '', url)
  try {
    await navigator.clipboard.writeText(url)
  } catch {
    /* clipboard may be blocked; the URL bar still holds the link */
  }
  shared.value = true
  setTimeout(() => (shared.value = false), 1500)
}

watch([source, invoke], scheduleRender)

// ---- split drag ---------------------------------------------------------
const splitEl = ref()
function startDrag(e: PointerEvent) {
  e.preventDefault()
  dragging.value = true
  window.addEventListener('pointermove', onDrag)
  window.addEventListener('pointerup', endDrag, { once: true })
}
function onDrag(e: PointerEvent) {
  const el = splitEl.value
  if (!el) return
  const r = el.getBoundingClientRect()
  const pct = ((e.clientX - r.left) / r.width) * 100
  split.value = Math.min(72, Math.max(28, pct))
}
function endDrag() {
  dragging.value = false
  window.removeEventListener('pointermove', onDrag)
}

// ---- CodeMirror (client-only) ------------------------------------------
const editorEl = ref()
let view: any
function setEditorDoc(text: string) {
  if (!view) return
  const cur = view.state.doc.toString()
  if (cur === text) return // unchanged (e.g. already-formatted) — don't touch the cursor
  // Preserve the caret offset across the full-doc replace (clamped to the new
  // length) so format-on-run doesn't jump the cursor to the start of the file.
  const head = Math.min(view.state.selection.main.head, text.length)
  view.dispatch({
    changes: { from: 0, to: view.state.doc.length, insert: text },
    selection: { anchor: head },
  })
}

let themeCompartment: any
let buildEditorTheme: (dark: boolean) => any[]

onMounted(async () => {
  // A shared link overrides the default preset before the editor is created.
  loadFromHash()

  const [{ EditorView, basicSetup }, { javascript }, { EditorState, Compartment, Prec, RangeSetBuilder }, { keymap, Decoration, ViewPlugin }, lang, hl] =
    await Promise.all([
      import('codemirror'),
      import('@codemirror/lang-javascript'),
      import('@codemirror/state'),
      import('@codemirror/view'),
      import('@codemirror/language'),
      import('@lezer/highlight'),
    ])
  const { HighlightStyle, syntaxHighlighting } = lang as any
  const { tags: t } = hl as any

  // Highlight Go-Playground-style `-- file.gsx --` separator lines so multi-file
  // sources read as dividers, not code.
  const fileSeparator = /^--\s+\S+\s+--\s*$/
  const separatorDeco = Decoration.line({ class: 'pg__sep-line' })
  const separatorPlugin = ViewPlugin.fromClass(
    class {
      decorations: any
      constructor(view: any) {
        this.decorations = this.build(view)
      }
      update(u: any) {
        if (u.docChanged || u.viewportChanged) this.decorations = this.build(u.view)
      }
      build(view: any) {
        const b = new RangeSetBuilder()
        for (const { from, to } of view.visibleRanges) {
          for (let pos = from; pos <= to; ) {
            const line = view.state.doc.lineAt(pos)
            if (fileSeparator.test(line.text)) b.add(line.from, line.from, separatorDeco)
            pos = line.to + 1
          }
        }
        return b.build()
      }
    },
    { decorations: (v: any) => v.decorations },
  )

  const scroller = {
    fontFamily: "'IBM Plex Mono', ui-monospace, monospace",
    fontSize: '13.5px',
    lineHeight: '1.7',
  }
  const chrome = (text: string, gutter: string, gutterActive: string) =>
    EditorView.theme(
      {
        '&': { color: text, backgroundColor: 'transparent', height: '100%' },
        '.cm-scroller': scroller,
        '.cm-content': { caretColor: '#00ADD8' },
        '.cm-cursor': { borderLeftColor: '#00ADD8' },
        '.cm-gutters': { backgroundColor: 'transparent', color: gutter, border: 'none' },
        '.cm-activeLine': { backgroundColor: 'rgba(0,173,216,0.07)' },
        '.cm-activeLineGutter': { backgroundColor: 'transparent', color: gutterActive },
        '&.cm-focused .cm-selectionBackground, .cm-selectionBackground': {
          backgroundColor: 'rgba(0,173,216,0.20)',
        },
        '.cm-matchingBracket': { backgroundColor: 'rgba(0,173,216,0.18)', outline: 'none' },
      },
      { dark: false },
    )

  // GitHub-dark and GitHub-light syntax palettes.
  const hlDark = HighlightStyle.define([
    { tag: t.keyword, color: '#ff7b72' },
    { tag: [t.string, t.special(t.string)], color: '#a5d6ff' },
    { tag: [t.typeName, t.tagName, t.className], color: '#7ee787' },
    { tag: [t.propertyName, t.attributeName], color: '#79c0ff' },
    { tag: t.number, color: '#f0883e' },
    { tag: [t.comment, t.lineComment, t.blockComment], color: '#768390', fontStyle: 'italic' },
    { tag: [t.bool, t.atom], color: '#79c0ff' },
    { tag: t.function(t.variableName), color: '#d2a8ff' },
    { tag: t.operator, color: '#ff7b72' },
  ])
  const hlLight = HighlightStyle.define([
    { tag: t.keyword, color: '#cf222e' },
    { tag: [t.string, t.special(t.string)], color: '#0a3069' },
    { tag: [t.typeName, t.tagName, t.className], color: '#116329' },
    { tag: [t.propertyName, t.attributeName], color: '#0550ae' },
    { tag: t.number, color: '#0550ae' },
    { tag: [t.comment, t.lineComment, t.blockComment], color: '#6e7781', fontStyle: 'italic' },
    { tag: [t.bool, t.atom], color: '#0550ae' },
    { tag: t.function(t.variableName), color: '#8250df' },
    { tag: t.operator, color: '#cf222e' },
  ])

  buildEditorTheme = (dark: boolean) =>
    dark
      ? [chrome('#cdd9e5', '#3f5165', '#3fc7e6'), syntaxHighlighting(hlDark)]
      : [chrome('#1b2026', '#aab4bf', '#0883a6'), syntaxHighlighting(hlLight)]

  themeCompartment = new Compartment()

  view = new EditorView({
    parent: editorEl.value!,
    state: EditorState.create({
      doc: source.value,
      extensions: [
        // Cmd/Ctrl+Enter runs (higher precedence than the default keymap).
        Prec.highest(
          keymap.of([
            { key: 'Mod-Enter', run: () => { formatAndRun(); return true } },
          ]),
        ),
        basicSetup,
        javascript({ jsx: true }),
        separatorPlugin,
        themeCompartment.of(buildEditorTheme(isDark.value)),
        EditorView.lineWrapping,
        EditorView.updateListener.of((u: any) => {
          if (u.docChanged) {
            source.value = u.state.doc.toString()
          }
        }),
      ],
    }),
  })

  render()
})

// Swap the editor theme live when the VitePress light/dark toggle flips.
watch(isDark, (dark) => {
  if (view && themeCompartment && buildEditorTheme) {
    view.dispatch({ effects: themeCompartment.reconfigure(buildEditorTheme(dark)) })
  }
})

onBeforeUnmount(() => {
  view?.destroy()
  if (timer) clearTimeout(timer)
})
</script>

<template>
  <div class="pg" :class="{ 'pg--dragging': dragging, 'pg--dark': isDark }">
    <header class="pg__bar">
      <div class="pg__brand">
        <span class="pg__logo">gsx</span>
        <span class="pg__title">Playground</span>
      </div>
      <div class="pg__mid">
        <div class="pg__select">
          <select v-model="presetIdx" @change="loadPreset" aria-label="Example">
            <option v-if="presetIdx === -1" :value="-1">Shared link</option>
            <option v-for="(p, i) in presets" :key="i" :value="i">{{ p.name }}</option>
          </select>
          <span class="pg__chev">▾</span>
        </div>
      </div>
      <div class="pg__right">
        <span class="pg__timing" :class="{ live: loading, edited: dirty }">
          <span v-if="loading" class="pg__spinner pg__spinner--sm"></span>
          <span v-else class="pg__pulse"></span>
          {{ loading ? 'compiling' : dirty ? 'edited · press Run' : ms ? ms + ' ms' : 'ready' }}
        </span>
        <label class="pg__toggle" :class="{ on: autorun }">
          <input type="checkbox" v-model="autorun" />
          <span>auto-run</span>
        </label>
        <button class="pg__share" @click="onFormat" title="Format (gsx fmt)">Format</button>
        <button class="pg__share" @click="share">{{ shared ? 'Copied ✓' : 'Share' }}</button>
        <button class="pg__run" @click="formatAndRun" title="Format &amp; Run (⌘/Ctrl+Enter)">Run</button>
      </div>
    </header>

    <div class="pg__split" ref="splitEl">
      <section class="pg__pane pg__edit" :style="{ width: split + '%' }">
        <div class="pg__head">
          <span class="pg__dot"></span> Component<span class="pg__ext">.gsx</span>
        </div>
        <div class="pg__cm" ref="editorEl"></div>
        <div class="pg__entry">
          <span class="pg__entry-label">render — the expression to render</span>
          <textarea
            class="pg__entry-input"
            v-model="invoke"
            spellcheck="false"
            autocomplete="off"
            rows="3"
            @keydown="runShortcut"
          ></textarea>
        </div>
      </section>

      <div class="pg__gutter" @pointerdown="startDrag"><span></span></div>

      <section class="pg__pane pg__out" :style="{ width: 100 - split + '%' }">
        <div class="pg__tabs">
          <button
            v-for="tb in tabs"
            :key="tb.id"
            class="pg__tab"
            :class="{ active: activeTab === tb.id }"
            @click="activeTab = tb.id"
          >
            {{ tb.label }}
            <span
              v-if="tb.id === 'problems' && diagnostics.length"
              class="pg__count"
              :class="{ err: hasErrors }"
            >{{ diagnostics.length }}</span>
          </button>
        </div>

        <div class="pg__body">
          <div v-if="loading" class="pg__loading">
            <span class="pg__spinner"></span>
            compiling…
          </div>
          <iframe
            v-show="activeTab === 'preview'"
            class="pg__preview"
            sandbox=""
            :srcdoc="srcdoc"
            title="rendered output"
          ></iframe>

          <pre v-show="activeTab === 'html'" class="pg__code hljs"><code v-html="htmlHi || '— no output —'"></code></pre>

          <pre v-show="activeTab === 'go'" class="pg__code hljs"><code v-html="goHi || '— no output —'"></code></pre>

          <div v-show="activeTab === 'problems'" class="pg__problems">
            <div v-if="error" class="pg__diag err">{{ error }}</div>
            <div
              v-for="(d, i) in diagnostics"
              :key="i"
              class="pg__diag"
              :class="d.severity"
            >
              <span class="pg__sev">{{ d.severity }}</span>
              <span class="pg__loc">{{ d.line }}:{{ d.column }}</span>
              <span class="pg__msg">
                {{ d.message }}<span v-if="d.code" class="pg__diag-code">{{ d.code }}</span>
                <span v-if="d.help" class="pg__diag-help">help: {{ d.help }}</span>
              </span>
            </div>
            <div
              v-if="!error && !diagnostics.length"
              class="pg__clean"
            >
              ✓ no problems
            </div>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.pg {
  /* Light palette (default). Dark overrides live in .pg--dark below. */
  --ink: #eef1f5;
  --panel: #ffffff;
  --panel-2: #f1f4f8;
  --line: #e2e7ee;
  --text: #1b2026;
  --muted: #6a7682;
  --accent: #00add8;
  --accent-2: #0883a6;
  --accent-ink: #04222b;
  --bar: #f7f9fb;
  --danger: #d92d20;
  --warn: #b45309;

  position: relative;
  display: flex;
  flex-direction: column;
  height: calc(100vh - var(--vp-nav-height, 64px));
  background: var(--ink);
  color: var(--text);
  font-family: 'IBM Plex Sans', system-ui, sans-serif;
  overflow: hidden;
  animation: pg-fade 0.5s ease both;
}
.pg--dark {
  --ink: #0c1118;
  --panel: #0f1620;
  --panel-2: #111a25;
  --line: #1d2733;
  --text: #cdd9e5;
  --muted: #6e7f92;
  --accent: #00add8;
  --accent-2: #3fc7e6;
  --accent-ink: #04222b;
  --bar: #0e1620;
  --danger: #ff6b6b;
  --warn: #f0b429;
}
@keyframes pg-fade {
  from { opacity: 0; transform: translateY(6px); }
}

/* Toolbar */
.pg__bar {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  gap: 1rem;
  padding: 0 16px;
  height: 52px;
  background: var(--bar);
  border-bottom: 1px solid var(--line);
}
.pg__brand { display: flex; align-items: baseline; gap: 10px; }
.pg__logo {
  font-family: 'IBM Plex Mono', monospace;
  font-weight: 600;
  font-size: 18px;
  color: var(--accent-2);
  letter-spacing: -0.5px;
}
.pg__logo::before { content: '{ '; color: var(--muted); }
.pg__logo::after { content: ' }'; color: var(--muted); }
.pg__title {
  font-size: 13px;
  text-transform: uppercase;
  letter-spacing: 2px;
  color: var(--muted);
}
.pg__mid { justify-self: center; }
.pg__select { position: relative; display: inline-flex; align-items: center; }
.pg__select select {
  appearance: none;
  background: var(--panel-2);
  color: var(--text);
  border: 1px solid var(--line);
  border-radius: 8px;
  padding: 7px 30px 7px 14px;
  font-family: 'IBM Plex Mono', monospace;
  font-size: 13px;
  cursor: pointer;
  transition: border-color 0.15s;
}
.pg__select select:hover { border-color: var(--accent); }
.pg__chev {
  position: absolute;
  right: 11px;
  color: var(--muted);
  pointer-events: none;
  font-size: 10px;
}
.pg__right { display: flex; align-items: center; justify-content: flex-end; gap: 14px; }
.pg__timing {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  font-family: 'IBM Plex Mono', monospace;
  font-size: 12px;
  color: var(--muted);
  min-width: 74px;
  white-space: nowrap;
}
.pg__timing.edited { color: var(--accent-2); font-weight: 500; }
.pg__pulse {
  width: 7px; height: 7px; border-radius: 50%;
  background: var(--accent);
  box-shadow: 0 0 0 0 rgba(0, 173, 216, 0.5);
}
.pg__timing.live .pg__pulse { animation: pg-pulse 1s infinite; }
/* Spinner — shown while a render is compiling (badge + output overlay). */
.pg__spinner {
  display: inline-block;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  border: 2.5px solid var(--line);
  border-top-color: var(--accent);
  animation: pg-spin 0.7s linear infinite;
}
.pg__spinner--sm { width: 12px; height: 12px; border-width: 2px; }
@keyframes pg-spin { to { transform: rotate(360deg); } }
.pg__loading {
  position: absolute;
  inset: 0;
  z-index: 5;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  background: color-mix(in srgb, var(--panel) 72%, transparent);
  color: var(--muted);
  font-family: 'IBM Plex Mono', monospace;
  font-size: 13px;
}
@keyframes pg-pulse {
  0% { box-shadow: 0 0 0 0 rgba(0,173,216,0.5); }
  70% { box-shadow: 0 0 0 6px rgba(0,173,216,0); }
  100% { box-shadow: 0 0 0 0 rgba(0,173,216,0); }
}
.pg__toggle {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--muted);
  cursor: pointer;
  user-select: none;
}
.pg__toggle input { accent-color: var(--accent); margin: 0; }
.pg__toggle.on { color: var(--text); }
.pg__run {
  background: var(--accent);
  color: var(--accent-ink);
  border: none;
  border-radius: 8px;
  padding: 7px 18px;
  font-family: 'IBM Plex Sans', sans-serif;
  font-weight: 600;
  font-size: 13px;
  cursor: pointer;
  transition: transform 0.1s, box-shadow 0.15s;
}
.pg__run:hover { box-shadow: 0 0 18px rgba(0, 173, 216, 0.35); }
.pg__run:active { transform: scale(0.96); }
.pg__share {
  background: transparent;
  color: var(--accent-2);
  border: 1px solid var(--line);
  border-radius: 8px;
  padding: 6px 14px;
  font-family: 'IBM Plex Sans', sans-serif;
  font-weight: 500;
  font-size: 13px;
  cursor: pointer;
  white-space: nowrap;
  transition: border-color 0.15s, color 0.15s;
}
.pg__share:hover { border-color: var(--accent); color: var(--accent); }
.pg__share:active { transform: scale(0.96); }

/* Split */
.pg__split { flex: 1; display: flex; min-height: 0; }
.pg__pane { display: flex; flex-direction: column; min-width: 0; }
.pg__head {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 16px;
  height: 38px;
  font-family: 'IBM Plex Mono', monospace;
  font-size: 12.5px;
  color: var(--muted);
  background: var(--panel);
  border-bottom: 1px solid var(--line);
}
.pg__ext { color: var(--accent-2); }
.pg__dot {
  width: 8px; height: 8px; border-radius: 50%;
  background: var(--accent);
  box-shadow: 0 0 8px var(--accent);
}
.pg__edit { background: var(--panel); }
.pg__cm { flex: 1; min-height: 0; overflow: auto; }
.pg__cm :deep(.cm-editor) { height: 100%; }
.pg__cm :deep(.cm-editor.cm-focused) { outline: none; }

.pg__entry {
  display: flex;
  flex-direction: column;
  gap: 7px;
  padding: 10px 14px 12px;
  border-top: 1px solid var(--line);
  background: var(--panel-2);
}
.pg__entry-label {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 10.5px;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: var(--accent-2);
}
.pg__entry-input {
  width: 100%;
  min-height: 86px;
  max-height: 240px;
  resize: vertical;
  box-sizing: border-box;
  background: var(--ink);
  border: 1px solid var(--line);
  border-radius: 7px;
  padding: 9px 11px;
  outline: none;
  color: var(--text);
  font-family: 'IBM Plex Mono', monospace;
  font-size: 13px;
  line-height: 1.55;
  white-space: pre;
  overflow: auto;
  transition: border-color 0.15s;
}
.pg__entry-input:focus {
  border-color: var(--accent);
}

/* Gutter */
.pg__gutter {
  flex: 0 0 8px;
  cursor: col-resize;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--ink);
}
.pg__gutter span {
  width: 2px; height: 36px; border-radius: 2px;
  background: var(--line);
  transition: background 0.15s, height 0.15s;
}
.pg__gutter:hover span { background: var(--accent); height: 60px; }
.pg--dragging { cursor: col-resize; user-select: none; }
.pg--dragging .pg__preview { pointer-events: none; }

/* Output */
.pg__out { background: var(--panel); border-left: 1px solid var(--line); }
.pg__tabs {
  display: flex;
  gap: 2px;
  height: 38px;
  padding: 0 8px;
  background: var(--panel);
  border-bottom: 1px solid var(--line);
}
.pg__tab {
  position: relative;
  background: none;
  border: none;
  color: var(--muted);
  font-family: 'IBM Plex Sans', sans-serif;
  font-size: 13px;
  padding: 0 14px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 7px;
  transition: color 0.15s;
}
.pg__tab:hover { color: var(--text); }
.pg__tab.active { color: var(--text); }
.pg__tab.active::after {
  content: '';
  position: absolute;
  left: 12px; right: 12px; bottom: -1px;
  height: 2px;
  background: var(--accent);
  border-radius: 2px;
}
.pg__count {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 10px;
  background: var(--warn);
  color: #2b2200;
  border-radius: 999px;
  padding: 1px 6px;
  font-weight: 600;
}
.pg__count.err { background: var(--danger); color: #2b0000; }

.pg__body { flex: 1; min-height: 0; position: relative; }
.pg__preview {
  width: 100%; height: 100%; border: none;
  background: #fff;
}
.pg__code {
  position: absolute; inset: 0;
  margin: 0;
  padding: 16px;
  overflow: auto;
  font-family: 'IBM Plex Mono', monospace;
  font-size: 12.5px;
  line-height: 1.65;
  color: var(--text);
  white-space: pre;
  tab-size: 4;
}
/* highlight.js token colors for the HTML/Go output tabs (GitHub light/dark,
   matching the editor palette). v-html content needs :deep. */
.pg__code :deep(.hljs-comment) { color: #6e7781; font-style: italic; }
.pg__code :deep(.hljs-keyword), .pg__code :deep(.hljs-literal) { color: #cf222e; }
.pg__code :deep(.hljs-string), .pg__code :deep(.hljs-meta .hljs-string) { color: #0a3069; }
.pg__code :deep(.hljs-number), .pg__code :deep(.hljs-built_in) { color: #0550ae; }
.pg__code :deep(.hljs-title), .pg__code :deep(.hljs-title.function_) { color: #8250df; }
.pg__code :deep(.hljs-type) { color: #953800; }
.pg__code :deep(.hljs-name) { color: #116329; }
.pg__code :deep(.hljs-attr) { color: #0550ae; }
.pg--dark .pg__code :deep(.hljs-comment) { color: #768390; }
.pg--dark .pg__code :deep(.hljs-keyword), .pg--dark .pg__code :deep(.hljs-literal) { color: #ff7b72; }
.pg--dark .pg__code :deep(.hljs-string), .pg--dark .pg__code :deep(.hljs-meta .hljs-string) { color: #a5d6ff; }
.pg--dark .pg__code :deep(.hljs-number), .pg--dark .pg__code :deep(.hljs-built_in) { color: #79c0ff; }
.pg--dark .pg__code :deep(.hljs-title), .pg--dark .pg__code :deep(.hljs-title.function_) { color: #d2a8ff; }
.pg--dark .pg__code :deep(.hljs-type) { color: #ffa657; }
.pg--dark .pg__code :deep(.hljs-name) { color: #7ee787; }
.pg--dark .pg__code :deep(.hljs-attr) { color: #79c0ff; }
.pg__problems { position: absolute; inset: 0; overflow: auto; padding: 12px; }
.pg__diag {
  display: grid;
  grid-template-columns: auto auto 1fr;
  gap: 10px;
  align-items: baseline;
  padding: 9px 12px;
  border-radius: 8px;
  background: var(--panel-2);
  border-left: 3px solid var(--warn);
  margin-bottom: 8px;
  font-size: 13px;
}
.pg__diag.error { border-left-color: var(--danger); }
.pg__diag.err { border-left-color: var(--danger); grid-template-columns: 1fr; }
.pg__sev {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--warn);
}
.pg__diag.error .pg__sev { color: var(--danger); }
.pg__loc { font-family: 'IBM Plex Mono', monospace; font-size: 12px; color: var(--muted); }
.pg__msg { font-family: 'IBM Plex Mono', monospace; font-size: 12.5px; }
.pg__diag-code {
  margin-left: 8px;
  padding: 1px 6px;
  border-radius: 5px;
  background: var(--panel);
  border: 1px solid var(--line);
  font-size: 11px;
  color: var(--muted);
}
.pg__diag-help { display: block; margin-top: 4px; color: var(--accent-2); }
.pg__clean {
  color: var(--muted);
  font-family: 'IBM Plex Mono', monospace;
  font-size: 13px;
  padding: 8px 4px;
}

/* Multi-file separator lines: `-- file.gsx --`
   Must use :deep() — CodeMirror generates the .cm-line DOM; Vue scoped styles
   won't pierce it without this. */
.pg__cm :deep(.pg__sep-line) {
  background: color-mix(in srgb, var(--accent) 12%, transparent);
  border-top: 1px solid var(--line);
  font-weight: 600;
}

@media (max-width: 720px) {
  /* Toolbar: row 1 = brand + controls; row 2 = full-width preset selector. */
  .pg__bar {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    height: auto;
    padding: 9px 12px;
    gap: 9px 10px;
  }
  .pg__brand { flex: 1 1 auto; white-space: nowrap; }
  .pg__title { display: none; }
  .pg__right { flex: 0 0 auto; gap: 12px; }
  .pg__mid { order: 3; flex: 1 1 100%; justify-self: stretch; }
  .pg__mid .pg__select { display: flex; width: 100%; }
  .pg__mid .pg__select select { width: 100%; }
  .pg__timing { min-width: 0; }
  .pg__toggle { white-space: nowrap; }

  .pg__split { flex-direction: column; }
  .pg__pane { width: 100% !important; height: 50%; }
  .pg__gutter { display: none; }
  .pg__out { border-left: none; border-top: 1px solid var(--line); }
}
.pg__logo { white-space: nowrap; }
</style>
