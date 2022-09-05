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
  </a>
  <a href="https://hub.docker.com/r/aaronleopold/stump">
    <img src="https://img.shields.io/docker/pulls/aaronleopold/stump?logo=docker&color=0aa8d2&logoColor=fff" alt="Docker Pulls">
  </a> -->
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
- [Project Structure 📦](#project-structure-)
- [Developing 💻](#developing-)
  - [Setup Script ⚙️](#setup-script-️)
  - [Running Stump 🏃‍♀️](#running-stump-️)
  - [Where to start? 🤔](#where-to-start-)
- [Similar Projects 👯](#similar-projects-)
- [License 🔑](#license-)
  </p>
</details>

> **🚧 Disclaimer 🚧**: Stump is _very much_ an ongoing **WIP**, under active development. Anyone is welcome to try it out, but please keep in mind that installation and general usage at this point should be for **testing purposes only**. Before the first release, I will likely flatten the migrations anyways, which would break anyone's Stump installations. If you'd like to contribute and help expedite Stump's first release, please see the [Developing](#developing-) section below for more information on how you can help. Otherwise, stay tuned for the first release!

## Roadmap 🗺

> Stump is very young software under active development. It has not reached a beta stage yet, so do not expect a fully featured, bug-free experience if you spin up a development environment or use a testing Docker image.

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

## Project Structure 📦

I am omitting a lot of files and only focusing on the main directories, but the following is the structure of the project:

```
.
├── apps
│   ├── client
│   │   └── src
│   └── website
│       └── src
├── core
│   ├── bindings
│   ├── prisma
│   └── src
├── README.md
└── ...
```

The `core` directory is where Stump's 'core' functionality is located, written in Rust. Stump uses [Prisma](https://github.com/Brendonovich/prisma-client-rust).

The `apps` directory is where Stump applications are located. These are separate from the Rust core, and are individual applications:

- `client`: A React application that is served by a Stump server. This is the primary web-client for interacting with a Stump server.

- `website`: A Next.js application for the Stump landing site and documentation pages. The documentation is created using [Markdoc](https://markdoc.io/). This code gets deployed to [stumpapp.dev](http://stumpapp.dev)

## Developing 💻

Contributions are very **encouraged** and **welcome**!

I put together a small set of [resources](https://www.stumpapp.dev/contributing#developer-resources) to get you started with Stump. If you're completely new to rust and/or web development, I recommend reviewing the [Rust Book](https://doc.rust-lang.org/book/) and [Getting started with React](https://reactjs.org/docs/getting-started.html) in that section first.

Please review the [CONTRIBUTING.md](./CONTRIBUTING.md) beforehand. To get started, you'll need to set up your development environment.

**Ensure you are on the `develop` branch before continuing.**

### Setup Script ⚙️

> If you feel that your system is already configured for development, you may skip this step and run `cargo install cargo-watch` and `pnpm run setup`. I highly recommend using the script, however.

> **Note**: If you are on a Windows machine, you will need [Visual C++](https://docs.microsoft.com/en-us/cpp/windows/latest-supported-vc-redist?view=msvc-170) installed on your system.

The setup script handles most of the initial configuration and installation of dependencies, however you should ensure you at least have the basics: [pnpm](https://pnpm.io/installation), [rust](https://www.rust-lang.org/tools/install) and [node](https://nodejs.org/en/download/). The script may ask to attempt installing `pnpm` using `npm` if it is not found in your $PATH.

If you are on a Windows machine, you'll need to run the following:

```
.\.github\scripts\setup.ps1
```

Otherwise, you can run the following:

```bash
./.github/scripts/setup.sh
```

These scripts will run system checks for `cargo` and `pnpm`, and will install a few additional dependencies, depending on your system. It will then install all the direct, Stump development dependencies, build the frontend bundle (required for server to start), generate the prisma client and sqlite database.

If you face any issues running these, or are using a system that is not supported by the setup scripts, please consider [adding/improving support](https://github.com/aaronleopold/stump/issues) for your system.

### Running Stump 🏃‍♀️

To start the application for development, simply run:

```bash
pnpm dev
```

This will start both the vite dev server and the rust server, watching for changes. You can also run the server and the client in separate processes:

```bash
pnpm core dev # start the Stump server
pnpm client dev # start the web client
```

To run in a release profile, you would just need to run:

```bash
pnpm core start
```

### Where to start? 🤔

If you're looking to contribute, but aren't sure where to start, I recommend taking a look at the [task board](https://github.com/users/aaronleopold/projects/2). This is where I track the development of Stump, mostly for personal organization. You can see what features are being worked on and what needs to be done.

Features are categorized by `Core: Frontend` (the React client, for now), `Core: Backend` (the Rust server), `Core: Devops` (Docker and other misc devops things), and `Website` (the documentation website). I'll be responsive on [Discord](https://discord.gg/63Ybb7J3as) (and eventually Matrix) if you have any questions, so feel free to reach out!

## Similar Projects 👯

There are a number of other projects that are similar to Stump, it certainly isn't the first or only digital book media server out there (_heck, it isn't even in beta yet_)! if Stump isn't for you, or you want to check out similar projects in the rust and/or self hosting spaces, consider checking out these other open source projects:

- [Komga](https://github.com/gotson/komga)
- [Kavita](https://github.com/Kareadita/Kavita)
- [audiobookshelf](https://github.com/advplyr/audiobookshelf) (_Audio books, Podcasts_)
- [Dim](https://github.com/Dusk-Labs/dim) (_Video, Audio_) (✨*Rust*✨)

## License 🔑

Stump codebase is licensed under an [MIT license](./LICENSE) - (_[tldr;](https://tldrlegal.com/license/mit-license)_). This does **not** apply to Stump's logo, if you would like to use the logo for anything other than a reference to Stump, please [contact me](aaronleopold1221@gmail.com).
