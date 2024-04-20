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
<img alt="Screenshot of Stump" src="./.github/images/demo.png" style="width: 90%" />
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
  - [Apps](#apps)
  - [Core](#core)
  - [Crates](#crates)
  - [Docs](#docs)
  - [Packages](#packages)
- [Similar Projects 👯](#similar-projects-)
- [License 📝](#license-)
</details>

> **🚧 Disclaimer 🚧**: Stump is under active development and is an ongoing **WIP**. Anyone is welcome to try it out, but **DO NOT** expect a fully featured or bug-free experience. If you'd like to contribute and help expedite Stump's first release, please review the [developer guide](#developer-guide-).

## Roadmap 🗺

The following items are the major targets for Stump's first release:

- 📃 Full OPDS + OPDS Page Streaming support
- 📕 EPUB, PDF, and CBZ/CBR support
- 📚 Organize libraries with collections and reading lists
- 🔐 Granular access-control with managed user accounts
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

Stump isn't ready for normal usage yet. To give it a spin, it is recommended to try the nightly [Docker image](https://hub.docker.com/r/aaronleopold/stump). If you're interested in development, or trying it from source, you can follow the [developer guide](#developer-guide-).

For more information about getting started, check out the [guides](https://stumpapp.dev/guides) available on the Stump website.

## Developer Guide 💻

Contributions are very **welcome**! Please review the [CONTRIBUTING.md](https://github.com/stumpapp/stump/tree/develop/.github/CONTRIBUTING.md) before getting started.

A quick summary of the steps required to get going:

1. Install [yarn](https://yarnpkg.com/), [rust](https://www.rust-lang.org/tools/install) and [node](https://nodejs.org/en/download/).
   - If you're running Windows, you will need [Visual C++](https://docs.microsoft.com/en-us/cpp/windows/latest-supported-vc-redist?view=msvc-170)
   - If you're running macOS on Apple Silicon, you'll need to install [Rosetta](https://support.apple.com/en-us/HT211861)
2. Install [cargo-watch](https://crates.io/crates/cargo-watch)
3. Run the setup script:

   ```bash
   ./scripts/system-setup.sh
   ```

   This isn't strictly necessary, and is mostly beneficial for Linux users (it installs some system dependencies). Feel free to skip this step if you'd like, and instead just run:

   ```bash
   yarn run setup
   ```

   This will build the React app, generate the Prisma client, and generate the Rust-TypeScript types. To do any of these individually, you can run:

   ```bash
    # build the React app
    yarn web build
    # generate the Prisma client and Rust-TypeScript types
    cargo codegen # or cargo prisma generate --schema=./core/prisma/schema.prisma for just the Prisma client
   ```

4. Start one of the apps:

   A few example commands are:

   ```bash
   # run the webapp + server
   yarn dev:web
   # run the desktop app + server
   yarn start:desktop
   # run the docs website
   yarn docs dev
   ```

   Or just `cargo` for the server (and other Rust apps):

   ```bash
   cargo run --package stump_server --bin stump_server
   ```

And that's it!

#### Where to start?

If you aren't sure where to start, I recommend taking a look at [open issues](https://github.com/stumpapp/stump/issues). You can also check out the [current project board](https://github.com/orgs/stumpapp/projects/4) to see what's actively being worked on or planned.

In general, the following areas are good places to start:

- Translation, so Stump is accessible to as many people as possible
  - [Crowdin](https://crowdin.com/project/stump) is used for translations
- Writing comprehensive tests
- Designing and/improving UI/UX
- Docker build optimizations, caching, etc
- CI pipelines, automated releases and release notes, etc
- And lots more!

[![Run in Postman](https://run.pstmn.io/button.svg)](https://app.getpostman.com/run-collection/6434946-9cf51d71-d680-46f5-89da-7b6cf7213a20?action=collection%2Ffork&collection-url=entityId%3D6434946-9cf51d71-d680-46f5-89da-7b6cf7213a20%26entityType%3Dcollection%26workspaceId%3D722014ea-55eb-4a49-b29d-814300c1016d)

## Project Structure 📦

<details>
  <summary><b>Click to expand</b></summary>
  
Stump has a monorepo structure managed by [yarn workspaces](https://yarnpkg.com/features/workspaces) and [cargo workspaces](https://doc.rust-lang.org/cargo/reference/workspaces.html). The project is split into a number of different packages and crates, each with their own purpose:

### Apps

Stand-alone applications that can be run independently, at `/apps` in the root of the project:

- `desktop`: A React + Tauri desktop application
- `expo`: A React Native application ([#125](https://github.com/stumpapp/stump/issues/125))
- `server`: An [Axum](https://github.com/tokio-rs/axum) HTTP server
- `web`: A React application, the primary UI for both the built-in web app the server serves and the desktop app

The only exception to this is the `docs` app, which is a NextJS application and is located at `/docs` in the root of the project.

### Core

A Rust crate containing Stump's core functionalities, at `/core` in the root of the project

### Crates

Various Rust crates, at `/crates` in the root of the project:

- `cli`: A CLI library used in the `server` app
- `codegen`: A small rust app that handles all of the code generation for Stump
- `integrations`: A rust library containing integrations with other notification services
- `prisma-cli`: A small wrapper rust app to run the Prisma CLI

### Docs

A NextJS application for the Stump documentation site at `/docs` in the root of the project

### Packages

Various TypeScript packages, at `/packages` in the root of the project:

- `api`: All of the API functions used by the `client` package
- `client`: React-query config, hooks, and other client-side utilities
- `components`: Shared React components for the web and desktop applications
- `browser`: A React component that is essentially the "main" UI for Stump on browser-based platforms. It is isolated in order to be re-used in the two browser-based apps: `web` and `desktop`
- `types`: Shared TypeScript types for interfacing with Stump's core and API

</details>

## Similar Projects 👯

There are a number of other projects that are similar to Stump, it certainly isn't the first or only digital book media server out there. If Stump isn't for you, or you want to check out similar projects in the rust and/or self hosting spaces, consider checking out these other open source projects:

- [audiobookshelf](https://github.com/advplyr/audiobookshelf) (_Audio books, Podcasts_)
- [Dim](https://github.com/Dusk-Labs/dim) (_Video, Audio_) (✨*Rust*✨)
- [Kavita](https://github.com/Kareadita/Kavita)
- [Komga](https://github.com/gotson/komga)
- [Librum](https://github.com/Librum-Reader/Librum)
- [oqurum](https://github.com/oqurum) (✨*Rust*✨)

## License 📝

Stump is licensed under the [MIT License](https://www.tldrlegal.com/license/mit-license). This applies to the entire repository except for subfolders/packages which contain their own license file(s). In such cases, the license file(s) in the subfolder/package take precedence.
