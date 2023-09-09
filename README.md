<p align="center">
  <img alt="Stump's logo. Description: A young individual sitting on a tree stump reading a book. Inspired by Stump's creator's childhood, where a large amount of his time was spent sitting on a tree stump reading his comic books." src="./.github/images/logo.png" style="width: 50%" />
  <br />
  <a href="https://github.com/awesome-selfhosted/awesome-selfhosted#document-management---e-books">
    <img src="https://cdn.rawgit.com/sindresorhus/awesome/d7305f38d29fed78fa85652e3a63e154dd8e8829/media/badge.svg" alt="Awesome Self-Hosted">
  </a>
  <a href="https://discord.gg/63Ybb7J3as">
    <img src="https://img.shields.io/discord/972593831172272148?label=Discord&color=5865F2" />
  </a>
  <a href="https://github.com/stumpapp/stump/blob/main/LICENSE">
    <img src="https://img.shields.io/static/v1?label=License&message=MIT&color=CF9977" />
  </a>
  <a href="https://hub.docker.com/r/aaronleopold/stump">
    <img src="https://img.shields.io/docker/pulls/aaronleopold/stump?logo=docker&color=0aa8d2&logoColor=fff" alt="Docker Pulls">
  </a>
</p>

<p align='center'>
Stump is a free and open source comics, manga and digital book server with OPDS support, created with <a href="https://www.rust-lang.org/">Rust</a>, <a href='https://github.com/tokio-rs/axum'>Axum</a>, <a href='https://github.com/Brendonovich/prisma-client-rust'>Prisma</a> and <a href='https://reactjs.org/'>React</a>.
</p>

<p align='center'>
<img alt="Screenshot of Stump" src="./.github/images/demo-img.png" style="width: 90%" />
</p>

<!-- prettier-ignore: I hate you sometimes prettier -->
<details>
  <summary><b>Table of Contents</b></summary>
  <p>

- [Roadmap 🗺](#roadmap-)
- [Getting Started 🚀](#getting-started-)
- [Developer Guide 💻](#developer-guide-)
  - [Where to start?](#where-to-start)
- [Project Structure 📦](#project-structure-)
  - [/apps](#apps)
  - [/core](#core)
  - [/packages](#packages)
- [Similar Projects 👯](#similar-projects-)
- [Acknowledgements 🙏](#acknowledgements-)
</details>

> **🚧 Disclaimer 🚧**: Stump is under active development and is an ongoing **WIP**. Anyone is welcome to try it out, but **DO NOT** expect a fully featured or bug-free experience. I will likely flatten the migrations immediately prior to the `0.1.0` release, which will break existing Stump databases. If you'd like to contribute and help expedite Stump's first release, please review the [developer guide](#developer-guide-).

## Roadmap 🗺

The following items are the major targets for Stump's first release:

- 📃 Full OPDS + OPDS Page Streaming support
- 📕 EPUB, PDF, and CBZ/CBR support
- 📚 Organize libraries with collections and reading lists
- 🔐 Role-based access-control with managed user accounts
- 🚀 Easy setup and deployment using Docker or bare metal
- 👀 Fully responsive, built-in UI with a dark mode
- 🏃 Low resource utilization with excellent performance
- 🧰 Easily consumable and documented REST API, so community tools and scripts can interact with Stump
- 🌏 Language support _(look [here](https://github.com/stumpapp/stump/issues/106))_
- 🌈 And more!

Things you can expect to see after the first release:

- 🖥️ Cross-platform desktop app _(Windows, Mac, Linux)_
- 📖 [Tachiyomi](https://github.com/stumpapp/tachiyomi-extensions) support
- 📱 In-house mobile app _(Android, iOS)_
- 🔎 Versitile full-text search _(blocked by [prisma#9414](https://github.com/prisma/prisma/issues/9414))_
- 👥 Configurable book clubs _(see [this issue](https://github.com/stumpapp/stump/issues/120))_

Feel free to reach out if you have anything else you'd like to see!

## Getting Started 🚀

Stump isn't ready for normal usage yet. To give it a spin, it is reccommended to try the nightly [Docker image](https://hub.docker.com/r/aaronleopold/stump). If you're interested in development, or trying it from source, you can follow the [developer guide](#developer-guide-).

For more information about getting started, check out the [guides](https://stumpapp.dev/guides) available on the Stump website.

## Developer Guide 💻

Contributions are very **welcome**! Please review the [CONTRIBUTING.md](https://github.com/stumpapp/stump/tree/develop/.github/CONTRIBUTING.md) before getting started.

A quick summary of the steps required to get going:

1. Install [pnpm](https://pnpm.io/installation), [rust](https://www.rust-lang.org/tools/install) and [node](https://nodejs.org/en/download/).
   - If you're running Windows, you will need [Visual C++](https://docs.microsoft.com/en-us/cpp/windows/latest-supported-vc-redist?view=msvc-170)
   - If you're running macOS on Apple Silicon, you'll need to install [Rosetta](https://support.apple.com/en-us/HT211861)
2. Install [cargo-watch](https://crates.io/crates/cargo-watch)
3. Run the setup script:

   ```bash
   ./scripts/system-setup.sh
   ```

   This isn't strictly necessary, and is mostly beneficial for Linux users (it installs some system dependencies). Feel free to skip this step if you'd like, and instead just run:

   ```bash
   pnpm run setup
   ```

4. Start one of the apps:

   I use [moonrepo](https://moonrepo.dev/) for Stump's repository management. A few example commands are:

   ```bash
   # run the webapp + server
   moon run server:dev web:dev
   # run the desktop app + server
   moon run server:start desktop:dev
   # run the docs website
   moon run docs:dev
   ```

   This isn't a requirement though! You can also run the apps directly with `pnpm`:

   ```bash
   # run the webapp + server
   pnpm dev:web
   # run the desktop app + server
   pnpm dev:desktop
   # run the docs website
   pnpm docs dev
   ```

   Or just `cargo` for the server:

   ```bash
   cargo run --package stump_server --bin stump_server
   ```

And that's it!

#### Where to start?

If you aren't sure where to start, I recommend taking a look at [open issues](https://github.com/stumpapp/stump/issues). You can also check out the [milestones](https://github.com/stumpapp/stump/milestones) page for a more curated list of issues that need to be addressed.

In general, the following areas are good places to start:

- Translation, so Stump is accessible to as many people as possible
  - [Crowdin](https://crowdin.com/project/stump) is being used for translations
- Writing comprehensive tests
- Designing UI elements/sections or improving the existing UI/UX
- Docker build optimizations, caching, etc
- CI pipelines, automated releases and release notes, etc
- And lots more!

[![Run in Postman](https://run.pstmn.io/button.svg)](https://app.getpostman.com/run-collection/6434946-9cf51d71-d680-46f5-89da-7b6cf7213a20?action=collection%2Ffork&collection-url=entityId%3D6434946-9cf51d71-d680-46f5-89da-7b6cf7213a20%26entityType%3Dcollection%26workspaceId%3D722014ea-55eb-4a49-b29d-814300c1016d)

## Project Structure 📦

Stump has a monorepo structure managed by [pnpm workspaces](https://pnpm.io/workspaces) and [moonrepo](https://moonrepo.dev/):

### /apps

- `desktop`: A React+Tauri application.
- `docs`: A NextJS application for the Stump documentation site.
- `mobile`: A React Native application.
- `server`: An [Axum](https://github.com/tokio-rs/axum) HTTP server.
- `web`: A React application.

### /core

- `core`: A Rust crate containing Stump's core functionalities.

### /packages

- `api`: All of the API functions used by the `client` package.
- `client`: React-query config, hooks, and other client-side utilities.
- `components`: Shared React components for the web and desktop applications.
- `interface`: A React component responsible for the main UI layout for the web and desktop applications.
- `prisma-cli`: A small rust app to run the Prisma CLI.
- `types`: Shared TypeScript types for interfacing with Stump's core and API

## Similar Projects 👯

There are a number of other projects that are similar to Stump, it certainly isn't the first or only digital book media server out there. If Stump isn't for you, or you want to check out similar projects in the rust and/or self hosting spaces, consider checking out these other open source projects:

- [audiobookshelf](https://github.com/advplyr/audiobookshelf) (_Audio books, Podcasts_)
- [Dim](https://github.com/Dusk-Labs/dim) (_Video, Audio_) (✨*Rust*✨)
- [Kavita](https://github.com/Kareadita/Kavita)
- [Komga](https://github.com/gotson/komga)
- [Librum](https://github.com/Librum-Reader/Librum)
- [oqurum](https://github.com/oqurum) (✨*Rust*✨)

## Acknowledgements 🙏

- [Komga](https://github.com/gotson/komga) is a huge inspiration for Stump, an amazing comics/manga media server written in Kotlin.
- [Brendonovich](https://github.com/Brendonovich) for building [prisma client rust](https://github.com/Brendonovich/prisma-client-rust), which allows me to use Prisma with Rust. Stump originally used SeaORM, but the DX simply can't compare to Prisma.
