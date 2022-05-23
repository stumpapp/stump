<p align="center">
  <img alt="Stump's logo. Description: A young individual sitting on a tree stump reading a book. Inspired by Stump's creator's childhood, where a large amount of his time was spent sitting on a tree stump reading his comic books." src="./.github/images/logo.png" style="width: 50%" />
  <br />
  <a href="https://discord.gg/63Ybb7J3as">
    <img src="https://img.shields.io/discord/972593831172272148?label=Discord&color=5865F2" />
  </a>
  <a href="https://github.com/aaronleopold/stump/blob/main/LICENSE">
    <img src="https://img.shields.io/static/v1?label=License&message=MIT&color=000" />
  </a>
</p>

Stump is a free and open source comics server with OPDS support, **heavily** inspired by [Komga](https://github.com/gotson/komga), created with Rust, [Rocket](https://github.com/SergioBenitez/Rocket), [Prisma](https://github.com/Brendonovich/prisma-client-rust) and React.

I love Komga and use it at home, and I thought it would be cool to learn what goes into making something like this myself. I opted to develop this in Rust to hopefully, at the end of all this, create something just as if not almost as convenient but with a smaller footprint. _I also just want an excuse to practice Rust!_

<p align='center'>
<img alt="Screenshot of Stump" src="./.github/images/demo-img.png" style="width: 85%" />
</p>

## Roadmap

I'll list the major target features below - I am very open to suggestions and ideas, so feel free to reach out if you have anything you'd like to see!

- Full OPDS + OPDS Page Streaming support
- EPUB, PDF, and CBZ/CBR support
- Customizable configuration (for both Docker and local hosting)
- Scheduled and invokable filesystem indexing/scanning
- Support for a range of metadata operations (e.g. adding/removing tags, changing metadata, etc.)
- Import/export of libraries
- Configurable CBR-to-CBZ conversion
- Small footprint and resource utilization (Docker image size currently sits at ~41MB)
- Integrated web client (React) served by Rust server
  - Full Text Search
  - Server management
  - Built-in webreader for media
- Role-based access control (i.e. the server owner and authorized users)
- Language support (currently only English)
  - Once more of the core features are implemented, I'll be prioritizing language support

You can track the development of this project [here](https://github.com/users/aaronleopold/projects/2)

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

<!-- This file is used to seed the database with data. -->

### Website

The website package contains a Next.js application for the Stump landing page and documentation pages. The documentation aspect is created using [Markdoc](https://markdoc.io/). This code gets deployed to [stumpapp.dev](http://stumpapp.dev)

## Development Setup

There is now a setup script that handles most of the initial configuration, however ensure you at least have the basics: [pnpm](https://pnpm.io/installation), [rust](https://www.rust-lang.org/tools/install) and [node](https://nodejs.org/en/download/). The script may ask to attempt installing `pnpm` using `npm` if it is not found in your $PATH.

**Ensure you are on the `develop` branch before continuing.**

### Setup Script

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

### Running the Seed Script

A seed will be run to create essential starting data for development. At some point, server initialization logic will be added that will make this step optional, but for now it is required. If you are running the seed script, you can run the following for instructions:

```bash
cargo seed --help
```

In general, you should provide a `library_path` argument, which is the path to a Library directory on your system. This 'Library' should contain your folders that represent series. It will default to `$HOME/Documents/Stump`. You may provide a `user_name` argument, which will be the username of the server owner. Default will be 'oromei' with a password of 'oromei'. Specifiying a username will still yield an **equivalent** password.

An example folder structure for a one-library collection might be:

```
/Users/aaronleopold/Documents
├── Stump
│   ├── Marvel Comics
│   │   ├── The Amazing Spider-Man (2018)
│   │   │   ├── The Amazing Spider-Man 001 (2018).cbz
│   │   │   ├── The Amazing Spider-Man 002 (2018).cbz
│   │   │   └── etc.
│   │   └── The Amazing Spider-Man (2022)
│   │       ├── The Amazing Spider-Man 001 (2022).cbz
│   │       ├── The Amazing Spider-Man 002 (2022).cbz
│   │       └── etc.
│   └── EBooks
│       ├── Martin, George R R - [Song of Ice and Fire 3] - A Storm of Swords (2003).epub
│       ├── Tolkien, J R R - [The Lord of the Rings] - Hobbit Or There and Back Again (1986).epub
│       └── etc.
└── ...
```

Currently you'll have to navigate to the server directory in order to run with custom arguments. This will be fixed in the future, so you can use the `pnpm` command instead, however for now it would be:

```bash
cd packages/core/server
cargo seed -l='/Users/you/Documents/Stump/Marvel Comics' -u='oromei'
```

If you then want to rerun the seed, you can run the following:

```bash
pnpm core prisma:db-trash
pnpm core prisma:db-push
cd packages/core/server
cargo seed -l='/Users/you/Documents/Stump/Marvel Comics' -u='oromei'
```

Which will delete the database, create a new one, and then run the seed.

Note: After the seed completes, you will need to invoke a library scan job (i.e. populate your library with series/media). The seed outputs a URL at which you can make a POST request to trigger the scan, however you can also just continue on to the next step and use the UI to start a scan.

## Running Stump

To start the application for development, simply run:

```bash
pnpm core dev
```

This will start both the vite dev server and the rust server, watching for changes. You can also run the server and the frontend in separate processes:

```bash
pnpm core server:dev # start the server
pnpm core frontend:dev # start the frontend
```

## Docker

<details>
<summary>
  <b>Note: This is not currently configured properly. Migrating to Prisma from SeaORM bork this, but I am working on it.</b>
</summary>

No images have been published to dockerhub yet, so you'll have to build it yourself:

```bash
 # build the docker image
pnpm core build:docker
# create the docker container
docker create \
  --name=stump \
  --user 1000:1000 \
  -p 6969:6969 \
  --volume ~/.stump:/home/stump/.stump \
  --mount type=bind,source=/path/to/data,target=/data \
  --restart unless-stopped \
  stump
# run the docker container
docker start stump
```

As of now, you'll need to make the `source` and `target` paths match. So if you keep your libraries in `/Users/user/Library`, you'll need to bind `/Users/user/Library` to both `source` and `target`. This will eventually change to be more flexible.

</details>

## License

Stump codebase is licensed under an [MIT license](./LICENSE). This does not apply to Stump's logo, if you would like to use the logo for anything other than a reference to Stump, please [contact me](aaronleopold1221@gmail.com).

## Contributing

Contributions are very **encouraged** and **welcome**! Please review the [CONTRIBUTING.md](./CONTRIBUTING.md) file beforehand. Thanks!

#### Developer Resources

A few useful resources for developers looking to contribute:

- [Rocket documentation](https://rocket.rs/v0.5-rc/)
- [Prisma documentation](https://prisma.io/docs/prisma-client/introduction)
  - [Prisma Client Rust Documentation](https://github.com/Brendonovich/prisma-client-rust/tree/main/docs)
- [Chakra UI Documentation](https://chakra-ui.com/docs)
- [OPDS specification](https://specs.opds.io/)
- [OPDS Page Streaming](https://vaemendis.net/opds-pse/#:~:text=The%20OPDS%20Page%20Streaming%20Extension,having%20to%20download%20it%20completely.)
- [Getting started with React](https://reactjs.org/docs/getting-started.html)
- [Rust Book](https://doc.rust-lang.org/book/)
