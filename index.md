---
layout: home
hero:
  name: gsx
  text: Type-safe HTML that's actually pleasant to write
  tagline: JSX-style markup, compiled to plain Go.
  image:
    src: /gsx-favicon.svg
    alt: gsx
  actions:
    - theme: brand
      text: Get started
      link: /guide/getting-started
    - theme: alt
      text: Learn gsx
      link: /guide/learn
    - theme: alt
      text: Playground
      link: /playground
features:
  - title: Type-safe by construction
    details: Components lower to plain Go the compiler checks. Props use generated or user-owned structs, so contracts stay typed and explicit.
  - title: Close to HTML, close to Go
    details: JSX-style markup for templates; ordinary Go for everything else. Tag names and package declarations distinguish components from elements — see the [syntax reference](/guide/syntax/basic-syntax#element-vs-component).
  - title: templ-compatible
    details: gsx.Node has the identical method set to templ.Component, so gsx output drops into the templ ecosystem without importing templ.
---

> **[Status — alpha.](/guide/status)** The language and APIs may still change before a stable release.
>
> [gsx](https://github.com/gsxhq/gsx) — compiler & CLI ·
> [vscode-gsx](https://github.com/gsxhq/vscode-gsx) — editor extension ·
> [tree-sitter-gsx](https://github.com/gsxhq/tree-sitter-gsx) — grammar ·
> [gsxhq.github.io](https://github.com/gsxhq/gsxhq.github.io) — website & playground
