# Contributing

If you're interested in supporting Stump's development, and you know how to code, follow the steps outlined in the [developer guide](#developer-guide) section to get started. There are several areas where help is needed:

- Translation, so Stump is accessible to non-English speakers.
  - An automated translation system would be immensely helpful! If you're knowledgeable in this area, please reach out!
- Writing comprehensive integration tests.
  - [look here](https://github.com/aaronleopold/stump/tree/develop/core/integration-tests)
- Designing and/or implementing UI elements.
- Docker build optimizations (it is currently _horrendously_ slow).
- CI pipelines / workflows (given above issue with Docker is resolved).
- And lots more!

I keep track of all non-code contributions in a [CONTRIBUTORS.md](https://github.com/aaronleopold/stump/tree/develop/.github/CONTRIBUTORS.md) file on Stump's GitHub. If you contribute in that manner, please add yourself to the list!

You can contribute to the project financially by using any of these platforms:

- [Kofi](https://ko-fi.com/aaronleop)
- [GitHub Sponsors](https://github.com/sponsors/aaronleopold)
- [Open Collective](https://opencollective.com/stump)

## Developer Guide

Contributions are very **encouraged** and **welcome**!

I put together a small set of [resources](#developer-resources) to get you started with Stump. If you're completely new to rust and/or web development, I recommend reviewing the [Rust Book](https://doc.rust-lang.org/book/) and [Getting started with React](https://reactjs.org/docs/getting-started.html) in that section first.

Please review the [CONTRIBUTING.md](https://github.com/aaronleopold/stump/blob/main/CONTRIBUTING.md) beforehand. To get started, you'll need to set up your development environment.

**Ensure you are on the `develop` branch before continuing.**

{% callout title="Note" icon="note" %}
If you are on a Windows machine, you will need [Visual C++](https://docs.microsoft.com/en-us/cpp/windows/latest-supported-vc-redist?view=msvc-170) installed on your system.

If you are on a Mac with Apple Silicon, you will need to install [Rosetta](https://support.apple.com/en-us/HT211861).
{% /callout %}

You need to install [pnpm](https://pnpm.io/installation), [rust](https://www.rust-lang.org/tools/install) and [node](https://nodejs.org/en/download/). Additionally, if you want to run any of the dev scripts on the rust side of things, you'll need to install [cargo-watch](https://crates.io/crates/cargo-watch). Afterwards, run the following:

```bash
pnpm run setup
```

This will install the project dependencies, build the frontend bundle (required for server to start), generate the prisma client, and create the sqlite database.

### Running Stump

There are multiple client applications within Stump's monorepo, all relying on the Stump server. Each app has a startup script following the pattern `dev:client_app_name`. These will start the application along with the server concurrently. For example, to run the web client, simply run:

```bash
pnpm dev:web
```

You can also run the server and the client applications in separate processes:

```bash
pnpm server dev # start the Stump server
pnpm web dev # start the web client in browser
```

At this point, you're pretty much all set to start contributing!

### Repository Notes

I format my code using [Prettier](https://prettier.io/) and [rustfmt](https://github.com/rust-lang/rustfmt). There is a pre-commit hook that will run these for you, but I want to point out that all of the apps within this repository use 4 tab spaces for indentation. This is primarily for accessibility, as well as consistency with the Rust codebase. If you'd like, you can configure your editor to render whatever indentation you prefer, even though the raw code will be as described above. I personally maintain the 4 tab space rendering on the Rust side and shorten it to only render 2 on the frontend side.

### Developer Resources

A few useful resources for developers looking to contribute:

- [Rust Book](https://doc.rust-lang.org/book/)
- [Rocket documentation](https://rocket.rs/v0.5-rc/)
- [Prisma documentation](https://prisma.io/docs/prisma-client/introduction)
  - [Prisma Client Rust Documentation](https://prisma.brendonovich.dev/introduction)
- [Chakra UI Documentation](https://chakra-ui.com/docs)
- [OPDS specification](https://specs.opds.io/)
- [OPDS Page Streaming](https://vaemendis.net/opds-pse/#:~:text=The%20OPDS%20Page%20Streaming%20Extension,having%20to%20download%20it%20completely.)
- [Getting started with React](https://reactjs.org/docs/getting-started.html)
