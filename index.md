---
layout: home
hero:
  name: gsx
  text: HTML as a first-class Go value
  tagline: templ-style components, JSX-style markup, compiled to plain Go. A standard-library-only runtime.
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
    details: Components lower to plain Go the compiler checks. Props are generated structs — gsx owns the field names, so there is no symbol-resolver guesswork.
  - title: Close to HTML, close to Go
    details: JSX-style markup for templates; ordinary Go for everything else. Capitalization decides component-vs-element.
  - title: templ-compatible
    details: gsx.Node has the identical method set to templ.Component, so gsx output drops into the templ ecosystem without importing templ.
---

> **Status — alpha.** gsx is runnable end-to-end. `gsx init` scaffolds a Go and
> Vite application, and `npm run dev` starts the warm generation, server rebuild,
> browser error, and reload loop through `gsx dev`. The language and APIs are
> usable but may still change before a stable release.
