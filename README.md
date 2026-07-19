<p align="center">
  <img alt="Stump's logo. It depicts a young individual sitting on a tree stump reading a book. Inspired by the developer's childhood, where they spent a significant amount of time reading on a tree stump in their backyard" src="./.github/images/logo.png" style="width: 30%" />
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

Stump is a free and open source comics, manga, and digital book server with OPDS support, created with <a href="https://www.rust-lang.org/">Rust</a>, <a href='https://github.com/tokio-rs/axum'>Axum</a>, <a href='https://www.sea-ql.org/SeaORM/'>SeaORM</a> and <a href='https://reactjs.org/'>React</a>.

</p>

<p align='center'>
<img alt="Screenshot of Stump" src="./docs/public/images/landing-dark.png" style="width: 90%" />
</p>

<!-- prettier-ignore: I hate you sometimes prettier -->
<details>
  <summary><b>Table of Contents</b></summary>
  <p>

- [Disclaimer](#disclaimer)
- [Features](#features)
- [Roadmap](#roadmap)
- [Getting Started](#getting-started)
- [Developer Guide](#developer-guide)
  - [Contributing](#contributing)
- [Repository Structure](#repository-structure)
- [Similar Projects](#similar-projects)
- [License](#license)
- [Attribution](#attribution)
</details>

## Disclaimer

Stump is under active development and should be treated as **beta software** until it reaches a stable `1.0` release. I do my best to avoid breaking changes, or changes which might cause data loss, but there are no guarantees.

I develop and maintain Stump in my free time. In other words, this is not my job and there is no guarantee of any timeline for features or bug fixes.

## Features

- [OPDS](https://opds.io/) [v1.2](https://specs.opds.io/opds-1.2) (including [OPDS PSE](https://github.com/anansi-project/opds-pse)) and [v2.0](https://specs.opds.io/opds-2.0.html) support
- EPUB, PDF, CBZ/ZIP, and CBR/RAR support
- Built-in readers for all supported formats
- Annotations and highlights for EPUB books
- OIDC authentication
- Translations with [Crowdin](https://crowdin.com/project/stump)
- Multi-user account management with permissions, age restrictions, and other access control features
- Theming support with a handful of [built-in themes](https://www.stumpapp.dev/docs/apps/web/themes)
- [Kobo](https://www.stumpapp.dev/docs/guides/integrations/kobo) and [KoReader](https://www.stumpapp.dev/docs/guides/integrations/koreader) sync integrations
- Multiple different installation methods, including Docker and pre-built binaries

And more not mentioned. The [documentation](https://www.stumpapp.dev) will provide additional details about features, installation, and usage guides.

## Roadmap

You can track the [project boards](https://github.com/stumpapp/stump/projects?query=is%3Aopen) to see what efforts are currently being worked on or planned.

Feel free to create an issue or discussion if you have anything else you'd like to see!

## Getting Started

The installation guides are available in the [documentation](https://www.stumpapp.dev/docs/getting-started/installation) (or [the markdown](/docs/content/docs/getting-started/installation/index.mdx), if you prefer).

## Developer Guide

The developer guide is available in the [documentation](https://www.stumpapp.dev/docs/developer/contributing) (or [the markdown](/docs/content/docs/developer/contributing.mdx), if you prefer). To not have to maintain two copies of the same information, please refer to those links for the most up-to-date information.

### Contributing

Contributions are very **welcome**! Please review the [CONTRIBUTING.md](./.github/CONTRIBUTING.md) before getting started.

I recommend taking a look at [open issues](https://github.com/stumpapp/stump/issues). You can also check out the [project boards](https://github.com/stumpapp/stump/projects?query=is%3Aopen) to see what efforts are active or planned.

In general, the following areas could always use help:

- Translations, so Stump is accessible to as many people as possible
  - You can translate through [Crowdin](https://crowdin.com/project/stump) or help find/fix areas of the app that need better translation coverage
- Writing comprehensive tests
- Improving the UI/UX, even small changes can go a long way
- CI pipelines, automated release processes, and other devops-related efforts
- Addressing `TODO` or `FIXME` comments in the codebase

## Repository Structure

The repository is managed via yarn workspaces and cargo workspaces:

```bash
# The primary applications all grouped together
apps/
  desktop/   # Tauri wrapping the web UI
  expo/      # React Native app
  server/    # Axum server
  web/       # UI served by the server
# The primary internals, like file processing etc
core/
# Supporting Rust crates (cli, graphql, integrations, etc)
crates/
  migrations/  # Database migrations
  models/      # Database models
docs/
# Shared TypeScript packages
packages/
```

## Similar Projects

There are a number of other projects that are similar to Stump, it certainly isn't the first or only digital book media server out there. If Stump isn't for you, or you want to check out similar projects in this space, here are some other projects you might be interested in:

- [audiobookshelf](https://github.com/advplyr/audiobookshelf) (_Audiobooks, Podcasts_)
- [Codex](https://github.com/ajslater/codex)
- [Kavita](https://github.com/Kareadita/Kavita)
- [Komga](https://github.com/gotson/komga)
- [Storyteller](https://gitlab.com/storyteller-platform/storyteller)

## License

> If a package or subfolder has its own license file, that license takes precedence over the repository-level license and will be listed below.

- The [expo application](./apps/expo/LICENSE) is licensed under [GPL-3.0](https://www.gnu.org/licenses/gpl-3.0.html)
- All other code in the repository is licensed under [MIT License](https://www.tldrlegal.com/license/mit-license)

## Attribution

- Some of the icons used in the web and mobile applications are from the [Spacedrive](https://github.com/spacedriveapp/spacedrive/tree/main/packages/assets/icons) repository, and are licensed under the [AGPL-3.0](<https://www.tldrlegal.com/license/gnu-affero-general-public-license-v3-(agpl-3.0)>) license.
- The native Readium expo modules were adapted from [Storyteller](https://gitlab.com/storyteller-platform/storyteller)
