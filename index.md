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
    details: Components lower to plain Go the compiler checks. Each component keeps its exact authored Go signature and markup binds parameters by name, so contracts stay typed and explicit.
  - title: Close to HTML, close to Go
    details: JSX-style markup for templates; ordinary Go for everything else. Tag names and package-level declarations distinguish components from elements.
    link: /guide/syntax/basic-syntax#declare-a-component
    linkText: See the syntax reference
  - title: templ-compatible
    details: gsx.Node has the identical method set to templ.Component, so gsx output drops into the templ ecosystem without importing templ.
---

> **[Status — alpha, v0.1.0.](/guide/status#releases-and-versioning)** gsx ships tagged releases from `v0.1.0`; the language and APIs may still change before 1.0.
>
> [gsx](https://github.com/gsxhq/gsx) — compiler & CLI ·
> [gsxui](https://ui.gsxhq.dev/) — shadcn-style components for gsx ·
> [vscode-gsx](https://github.com/gsxhq/vscode-gsx) — editor extension ·
> [tree-sitter-gsx](https://github.com/gsxhq/tree-sitter-gsx) — grammar ·
> [gsxhq.github.io](https://github.com/gsxhq/gsxhq.github.io) — website & playground
