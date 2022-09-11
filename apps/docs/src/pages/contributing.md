# Contributing

If you're interested in supporting Stump's development, and you know how to code, follow the steps outlined in the [developer guide](#developer-guide) section to get started. There are several areas where help is needed:

- Translation, so Stump is accessible to non-English speakers.
- Writing comprehensive benchmarks and tests.
- TODO: write more examples
- And lots more!

If you can't contribute programatically, but you still wish to help, consider contributing financially by using any of these platforms:

- [Kofi](https://ko-fi.com/aaronleop)
- [GitHub Sponsors](https://github.com/sponsors/aaronleopold)
- [Open Collective](https://opencollective.com/stump)

## Developer Guide

Contributions are very **encouraged** and **welcome**!

I put together a small set of [resources](#developer-resources) to get you started with Stump. If you're completely new to rust and/or web development, I recommend reviewing the [Rust Book](https://doc.rust-lang.org/book/) and [Getting started with React](https://reactjs.org/docs/getting-started.html) in that section first.

Please review the [CONTRIBUTING.md](https://github.com/aaronleopold/stump/blob/main/CONTRIBUTING.md) beforehand. To get started, you'll need to set up your development environment.

**Ensure you are on the `develop` branch before continuing.**

### Setup Script

{% callout title="Note" icon="note" %}
If you feel that your system is already configured for development, you may skip this step and run `cargo install cargo-watch` and `pnpm run setup`. I highly recommend using the script, however.

If you are on a Windows machine, you will need [Visual C++](https://docs.microsoft.com/en-us/cpp/windows/latest-supported-vc-redist?view=msvc-170) installed on your system.
{% /callout %}

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

### Running Stump

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

At this point, you're pretty much all set! When you navigate to [`localhost:3000`](http://localhost:3000), or [`localhost:10801`](http://localhost:10801) using the release profile, Stump will prompt you to create the managing user account and then your first library.

### Where to start?

If you're looking to contribute, but aren't sure where to start, I recommend taking a look at the [task board](https://github.com/users/aaronleopold/projects/2). This is where I track the development of Stump, mostly for personal organization. You can see what features are being worked on and what needs to be done.

Features are categorized by `Core: Frontend` (the React client, for now), `Core: Backend` (the Rust server), `Core: Devops` (Docker and other misc devops things), and `Website` (the documentation website).

### Developer Resources

A few useful resources for developers looking to contribute:

- [Rust Book](https://doc.rust-lang.org/book/)
- [Rocket documentation](https://rocket.rs/v0.5-rc/)
- [Prisma documentation](https://prisma.io/docs/prisma-client/introduction)
  - [Prisma Client Rust Documentation](https://github.com/Brendonovich/prisma-client-rust/tree/main/docs)
- [Chakra UI Documentation](https://chakra-ui.com/docs)
- [OPDS specification](https://specs.opds.io/)
- [OPDS Page Streaming](https://vaemendis.net/opds-pse/#:~:text=The%20OPDS%20Page%20Streaming%20Extension,having%20to%20download%20it%20completely.)
- [Getting started with React](https://reactjs.org/docs/getting-started.html)
