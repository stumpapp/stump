# Contributing

If you're interested in contributing to Stump, and you know how to code, then you're in the right place! Follow the steps below to get started.

If you can't contribute programatically, but you still wish to help, consider contributing financially by using any of these platforms:

- [Kofi](https://ko-fi.com/aaronleop)
- [GitHub Sponsors](https://github.com/sponsors/aaronleopold)

## Project Structure

I am ommitting a lot of files and only focusing on the main directories, but the following is the structure of the project:

```bash
.
├── packages
│   ├── core
│   │   ├── frontend
│   │   └── server
│   │       ├── prisma
│   │       ├── prisma-cli
│   │       └── src
│   │           └── bin
│   │               └── seed.rs
│   └── website
├── README.md
└── ...
```

### Core

The core package is where Stump's core functionality is located.

`server`: This is the bulk of Stump's functionality. It is a Rocket server.

`frontend`: The frontend directory is where the web client is located. It is a static React application that is served by Stump.

### Website

The website package contains a Next.js application for the Stump landing page and documentation pages (what you're currently reading), created using [Markdoc](https://markdoc.io/).

## Development Setup

There is a setup script to handle most of the initial configuration, however please ensure you at least have the basics installed: [pnpm](https://pnpm.io/installation), [rust](https://www.rust-lang.org/tools/install) and [node](https://nodejs.org/en/download/). The script may ask to attempt installing `pnpm` using `npm` if it is not found in your `$PATH`.

**_Ensure you are on the `develop` branch before continuing._**:

```bash
git switch develop # or git checkout develop
```

### Setup Script

If you are on a Windows machine, you'll need to run the following:

```bash
.\.github\scripts\setup.ps1
```

Otherwise, you can run the following:

```bash
./.github/scripts/setup.sh
```

These scripts will run system checks for `cargo` and `pnpm`, and will install a few additional dependencies, depending on your system. It will then install all the direct, Stump development dependencies, build the frontend bundle (required for server to start), generate the prisma client and sqlite database.

{% callout title="Windows WSL" icon="warning" %}
I've found that running the setup script on Windows WSL works well, but if you're using it to install `pnpm` ensure you have node and npm configured to not point to your Windows installation of node/npm. You'll likely encounter a couple of permissions errors if it isn't configured this way.
{% /callout %}

If you face any issues running these, or are using a system that is not supported by the setup scripts, please consider [adding/improving support](https://github.com/aaronleopold/stump/issues) for your system.

### Running Stump

To start the application for development, simply run:

```bash
pnpm core dev
```

This will start both the vite dev server and the rust server, watching for changes and recompiling when necessary. If preferred, you may run the server and the frontend in separate processes:

```bash
pnpm core server:dev # start the server
pnpm core frontend:dev # start the frontend
```

At this point, you're pretty much all set! When you navigate to [`localhost:3000`](http://localhost:3000), Stump will prompt you to create the managing user account and then your first library.
