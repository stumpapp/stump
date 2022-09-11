<p align="center">
  <img alt="Stump's logo. Description: A young individual sitting on a tree stump reading a book. Inspired by Stump's creator's childhood, where a large amount of his time was spent sitting on a tree stump reading his comic books." src="./.github/images/logo.png" style="width: 50%" />
  <br />
  <a href="https://github.com/awesome-selfhosted/awesome-selfhosted#document-management---e-books">
    <img src="https://cdn.rawgit.com/sindresorhus/awesome/d7305f38d29fed78fa85652e3a63e154dd8e8829/media/badge.svg" alt="Awesome Self-Hosted">
  </a>
  <a href="https://discord.gg/63Ybb7J3as">
    <img src="https://img.shields.io/discord/972593831172272148?label=Discord&color=5865F2" />
  </a>
  <a href="https://github.com/aaronleopold/stump/blob/main/LICENSE">
    <img src="https://img.shields.io/static/v1?label=License&message=MIT&color=CF9977" />
  </a>
  <!-- <a href="./.github/CHANGELOG.md">
    <img src="https://img.shields.io/github/package-json/v/aaronleopold/stump?logo=azurepipelines&amp;color=0aa8d2" alt="Current Version">
  </a> -->
  <a href="https://hub.docker.com/r/aaronleopold/stump-preview">
    <img src="https://img.shields.io/docker/pulls/aaronleopold/stump-preview?logo=docker&color=0aa8d2&logoColor=fff" alt="Docker Pulls">
  </a>
</p>

<p align='center'>
Stump is a free and open source comics, manga and digital book server with OPDS support, created with <a href="https://www.rust-lang.org/">Rust</a>, <a href='https://github.com/SergioBenitez/Rocket'>Rocket</a>, <a href='https://github.com/Brendonovich/prisma-client-rust'>Prisma</a> and React.
</p>

<p align='center'>
<img alt="Screenshot of Stump" src="./.github/images/demo-img.png" style="width: 90%" />
</p>

<details>
  <summary><b>Table of Contents</b></summary>
  <p>

- [Roadmap 🗺](#roadmap-)
- [Getting Started 🚀](#getting-started-)
- [Developer Guide 💻](#developer-guide-)
- [Project Structure 📦](#project-structure-)
  - [/apps](#apps)
  - [/common](#common)
  - [/core](#core)
- [Similar Projects 👯](#similar-projects-)
- [License 🔑](#license-)
  </p>
</details>

> **🚧 Disclaimer 🚧**: Stump is _very much_ an ongoing **WIP**, under active development. Anyone is welcome to try it out, but please keep in mind that installation and general usage at this point should be for **testing purposes only**. Do **not** expect a fully featured, bug-free experience if you spin up a development environment or use a testing Docker image. Before the first release, I will likely flatten the migrations anyways, which would break anyone's Stump installations. If you'd like to contribute and help expedite Stump's first release, please see the [contributing guide](https://www.stumpapp.dev/contributing) for more information on how you can help. Otherwise, stay tuned for the first release!

## Roadmap 🗺

Some of these are actually completed(!) already, but the following items are the major targets for Stump's first beta release:

- 📃 Full OPDS + OPDS Page Streaming support
- 📕 EPUB, PDF, and CBZ/CBR support
- 📚 Organize libraries with collections and reading lists
- 🔎 Versitile full-text search
- 🔐 Role-based access-control with managed user accounts and configurable privileges
- 🚀 Easy setup and deployment using Docker or bare metal
- 🤏 Small bundle size with a fully responsive, built-in UI
- 🏃 Low resource utilization with excellent performance
- 🧰 Easily consumable and self-documented REST API, so community tools and scripts can interact with Stump
- 🌈 And more!

I am very open to suggestions and ideas, so feel free to reach out if you have anything you'd like to see!

> For more, feel free to view the [FAQ](https://stumpapp.dev/faq) page. If you're interested in tracking the development of specific features, you can take a look at the [Project Board](https://github.com/users/aaronleopold/projects/2).

## Getting Started 🚀

Stump isn't ready for normal, non-development usage yet. Once a release has been made, this will be updated. For now, follow the [Developing](#developing-) section to build from source and run locally.

There is a [docker image](https://hub.docker.com/repository/docker/aaronleopold/stump-preview) available for those interested. However, **this is only meant for testing purposes and will not be updated frequently**, so do not expect a fully featured, bug-free experience if you spin up a container.

For more information about getting started, how Stump works and how it manages your library, and much more, please visit [stumpapp.dev](https://stumpapp.dev/guides).

## Developer Guide 💻

Contributions are very **encouraged** and **welcome**! Please review the [developer guide](https://www.stumpapp.dev/contributing) on the documentation website for information on how to get started developing.

## Project Structure 📦

Stump has a monorepo structure that follows a similar pattern to that of [Spacedrive](https://www.spacedrive.com/).

### /apps

- `docs`: The documentation website, built with Next.js and [Markdoc](https://markdoc.io/), deployed to [stumpapp.dev](http://stumpapp.dev).
- `web`: The React application that is served by a Stump server.
- `desktop`: A Tauri application.

### /common

- `client`: Zustand and React Query configuration to be used by the `interface` package.
- `config`: Configuration files for the project, e.g. `tsconfig.json`, etc.
- `interface`: Stump's main React-based interface, shared between the web and desktop applications.

### /core

- `core`: Stump's 'core' functionality is located here, written in Rust. Effectively, this is a Rocket server.

## Similar Projects 👯

There are a number of other projects that are similar to Stump, it certainly isn't the first or only digital book media server out there (_heck, it isn't even in beta yet_)! if Stump isn't for you, or you want to check out similar projects in the rust and/or self hosting spaces, consider checking out these other open source projects:

- [Komga](https://github.com/gotson/komga)
- [Kavita](https://github.com/Kareadita/Kavita)
- [audiobookshelf](https://github.com/advplyr/audiobookshelf) (_Audio books, Podcasts_)
- [Dim](https://github.com/Dusk-Labs/dim) (_Video, Audio_) (✨*Rust*✨)

## License 🔑

Stump codebase is licensed under an [MIT license](./LICENSE) - (_[tldr;](https://tldrlegal.com/license/mit-license)_). This does **not** apply to Stump's logo, if you would like to use the logo for anything other than a reference to Stump, please [contact me](aaronleopold1221@gmail.com).
