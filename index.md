---
layout: home
hero:
  name: gsx
  text: HTML as a first-class Go value
  tagline: templ-style components, JSX-style markup, compiled to plain Go. A standard-library-only runtime.
  actions:
    - theme: brand
      text: Why gsx
      link: /guide/vision
    - theme: alt
      text: Syntax
      link: /guide/syntax
    - theme: alt
      text: GitHub
      link: https://github.com/gsxhq/gsx
features:
  - title: Type-safe by construction
    details: Components lower to plain Go the compiler checks. Props are generated structs — gsx owns the field names, so there is no symbol-resolver guesswork.
  - title: Close to HTML, close to Go
    details: JSX-style markup for templates; ordinary Go for everything else. Capitalization decides component-vs-element.
  - title: templ-compatible
    details: gsx.Node has the identical method set to templ.Component, so gsx output drops into the templ ecosystem without importing templ.
---

> **Status — alpha.** Language design is stable; parser, runtime, and codegen
> phase&nbsp;1 are done. The CLI is a work in progress, so gsx is **not yet
> runnable end-to-end**. Follow the
> [roadmap](https://github.com/gsxhq/gsx/blob/main/docs/ROADMAP.md).
