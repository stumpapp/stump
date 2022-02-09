# ![Stump Icon icon](./.github/images/logo.png)

A free and open source comics server with OPDS support, **heavily** inspired by [Komga](https://github.com/gotson/komga).

I love Komga and use it at home, and I thought it would be cool to learn what goes into making something like this myself. I opted to develop this in Rust to hopefully, at the end of all this, create something just as if not almost as convenient but with a smaller footprint. _I also just want to practice Rust!_

## Roadmap / To-do List

These are my current end-goals with some current todos sprinkled in:

- [x] Create Stump docker image that can be used to run the server on my Raspberry Pi (or any other machine)
  - [x] Create Dockerfile for prod
- [ ] Pass container config to stump, so it knows where the mount target is and can load the media
- [ ] Filesystem indexing of libraries
  - [ ] Walk through libraries and sync media to DB (done but reqs more testing)
    - [x] based on checksums (FIXME: this is working but **vvv slow**)
    - [x] log errors
- [ ] Full OPDS support
  - [x] Implement paging for the applicable OPDS feeds (e.g. `/opds/v1.2/series/1?page=1`)
  - [ ] Test common OPDS clients like [Panels](https://panels.app), [Chunky](http://chunkyreader.com/), etc
    - [ ] Panels:
      - [x] can connect without authentication
      - [x] can connect with authentication (only tested on catalog)
      - [x] can generate OPDS feeds for:
        - [x] catalogs
        - [x] libraries
        - [x] series
      - [ ] can fetch book thumbnails
        - [x] cbr (iffy, see FIXME notes)
        - [x] cbz
        - [ ] pdf
        - [ ] ~~epub~~ (not supported by Panels yet)
      - [ ] Page streaming support
        - [x] cbr (iffy, see FIXME notes)
        - [x] cbz
        - [ ] pdf
        - [ ] ~~epub~~ (not supported by Panels yet)
- [ ] Develop frontend client (Svelte) for:
  - [ ] reading media (epub, pdf, cbr, cbz)
  - [ ] managing media
  - [ ] managing access
- [x] Serve frontend with Stump server
- [ ] P2P file sharing options somewhere?
- [ ] Add authentication system (disgusting solution started as proof of concept, will rewrite)

I am very open to suggestions and ideas!

## Getting Started

There are no releases yet, so you'll have to clone the repo and build it yourself:

```bash
git clone https://github.com/aaronleopold/stump.git
cd stump
pnpm frontend:install
cargo install cargo-watch
```

## Running Stump

### Development

To start the application for development, simply run:

```bash
pnpm dev
```

This will start both the svelte dev server and the rust server, watching for changes. You can also run the server and the frontend in separate processes:

```bash
pnpm server:dev # start the server
pnpm frontend:dev # start the frontend
```

### Docker

- TODO: figure out indexing when in a docker container. Probably just need to mount the directory.
- TODO: publish image to docker hub

To create a docker image and corresponding container:

```bash
pnpm server:build:docker-alpine # builds the image
docker create \
  --name=stump \
  --user 1000:1000 \
  -p 6969:6969 \
  --volume ~/.stump:/home/stump/.stump \
  --mount type=bind,source=/path/to/data,target=/data \
  --restart unless-stopped \
  stump # creates the container
docker start stump # runs the container
```

As of now, you'll need to make the `source` and `target` paths match. So if you keep your libraries in `/Users/user/Library/comics`, you'll need to mount `/Users/user/Library/comics` to both. This will eventually change to be more flexible.

## Contributing

Contributions are very **encouraged** and **welcome**! Please open an issue prior to working on a bug or feature to let me know what you're interested in working on. Thanks!
