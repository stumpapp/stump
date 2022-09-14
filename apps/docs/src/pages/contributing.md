# Contributing

If you're interested in supporting Stump's development, and you know how to code, follow the steps outlined in the [developer guide](#developer-guide) section to get started. There are several areas where help is needed:

- Translation, so Stump is accessible to non-English speakers.
  - An automated translation system would be immensely helpful! If you're knowledgeable in this area, please reach out!
- Writing comprehensive benchmarks and tests.
- Designing and/or implementing missing UI components.
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

### Special Dependencies

If you are on a Windows machine, you will need [Visual C++](https://docs.microsoft.com/en-us/cpp/windows/latest-supported-vc-redist?view=msvc-170) installed on your system.

If you are on a Mac with Apple Silicon, you will need to install [Rosetta](https://support.apple.com/en-us/HT211861).

### Setup Script

{% callout title="Note" icon="note" %}
If you feel that your system is already configured for development, you may skip this step and run `cargo install cargo-watch` and `pnpm run setup`. I highly recommend using the script, however.
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

There are multiple client applications within Stump's monorepo, all relying on the Stump core server. Each app has a startup script following the pattern `dev:client_app_name`. These will start the application along with the server concurrently. For example, to run the web client, simply run:

```bash
pnpm dev:web
```

You can also run the server and the client applications in separate processes:

```bash
pnpm core dev # start the Stump server
pnpm web dev # start the web client
```

At this point, you're pretty much all set to start contributing!

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
