# apps

The 'apps' directory is where Stump applications are located. These are separate from the Rust core, and are really individual applications.

`client`: A React application that is served by a Stump server. This is the primary web-client for interacting with a Stump server.

`website`: A Next.js application for the Stump landing site and documentation pages. The documentation is created using [Markdoc](https://markdoc.io/). This code gets deployed to [stumpapp.dev](http://stumpapp.dev)

> Note: All instructions and commands listed in this README are relative to the project **root folder**, not the apps directory.

## Client

The client is a React application that uses a combination of `ChakraUI` and `Tailwind CSS` for styling. It uses `Zustand` for _some_ state management, but largely `React Query` for both state management and queries/caching.

### Application Structure

I am omitting a lot of files and only focusing on the main directories, but the following is the structure of the project:

```
/apps/client
└── src
    ├── api
    ├── components
    │   └── ui
    ├── hooks
    ├── i18n
    │   └── locales
    ├── pages
    ├── store
    └── util
```

- `api`: This is where all of the query functions used by react query are defined, grouped by entity (e.g. media, library, etc.).
- `components`: Custom React components live here. They are largely grouped by Entity and/or page.
  - `ui`: General purpose UI components live here, things like Buttons and what not.
- `hooks`: Custom React hooks live here
- `i18n`: Locale directory, mainly initializes `i18next`.
  - `locales`: JSON locale files are defined here. They are used for displaying various locales in Stump.
- `pages`: Contains all of the pages Stump has.
- `store`: Zustand initialization and implementation.
- `util`: Various utilities defined here, typically grouped by category.

### Running the Client

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

## Mobile

TBD 😉👀🤷

## Webiste

The website is mainly the documentation for Stump. It lives at [stumpapp.dev](http://stumpapp.dev). It uses Next.js, Tailwind and Markdoc.

### Application Structure

I am omitting a lot of files and only focusing on the main directories, but the following is the structure of the project:

```
/apps/website
└── src
    ├── components
    │   ├── markdoc
    │   └── ui
    ├── markdoc
    │   ├── functions.js
    │   ├── nodes
    │   └── tags
    └── pages
        ├── guides
        └──installation
```

- `components`:
  - `markdoc`: This is where React components for the Markdoc library are developed.
  - `ui`: General purpose UI components live here, things like Buttons and what not.
- `markdoc` This is where bindings for nodes, tags and functions are defined. Essentially, it instructs Markdown what React components (from `components/markdoc`) should be rendered for various types of markdown nodes/tags.
- `pages`: Standard location for Next.js pages. There's really only the landing page (`index.tsx`) and the `contributing.md` at the root, and then every other page is nested in either `guides` or `installation`. These directories are just markdown files.

### Running the Website

To start the website locally, run the following:

```bash
pnpm i
pnpm website dev
```
