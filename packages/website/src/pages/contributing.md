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

There is now a setup script that handles most of the initial configuration, however ensure you at least have the basics: [pnpm](https://pnpm.io/installation), [rust](https://www.rust-lang.org/tools/install) and [node](https://nodejs.org/en/download/). The script may ask to attempt installing `pnpm` using `npm` if it is not found in your $PATH.

**_Ensure you are on the `develop` branch before continuing._**

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

### Running the Seed Script

A seed will be run to create essential starting data for development. At some point, server initialization logic will be added that will make this step optional, but for now it is required. If you are running the seed script, you can run the following for instructions:

```bash
cargo seed --help
```

In general, you should provide a `library_path` (`-l`) argument, which is the path to a Library directory on your system. This 'Library' should contain your folders that represent series. It will default to `$HOME/Documents/Stump`. You may provide a `user_name` (`-u`) argument, which will be the username of the server owner. Default will be 'oromei' with a password of 'oromei'. Specifiying a username will still yield an **equivalent** password.

An example folder structure for a one-library collection might be:

```
/Users/aaronleopold/Documents/Stump
├── Marvel Comics
│   ├── The Amazing Spider-Man (2018)
│   │   ├── The Amazing Spider-Man 001 (2018).cbz
│   │   ├── The Amazing Spider-Man 002 (2018).cbz
│   │   └── etc.
│   ├── The Amazing Spider-Man (2022)
│   │   ├── The Amazing Spider-Man 001 (2022).cbz
│   │   ├── The Amazing Spider-Man 002 (2022).cbz
│   │   └── etc.
├── EBooks
│   ├── Martin, George R R - A Storm of Swords.epub
│   ├── Tolkien, J R R - Hobbit Or There and Back Again.epub
│   └── etc.
└── ...
```

Currently you'll have to navigate to the server directory in order to run with custom arguments:

```bash
cd packages/core/server
cargo seed -l='/Users/you/Documents/Stump/Marvel Comics' -u='oromei'
```

Note: After the seed completes, you will need to invoke a library scan job (i.e. populate your library with series/media). The seed outputs a URL at which you can make a POST request to trigger the scan, however you can also just continue on to the next step and use the UI to start a scan.
