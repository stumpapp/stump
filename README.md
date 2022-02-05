# Stump

A free and open source comics server with OPDS support, **heavily** inspired by [Komga](https://github.com/gotson/komga).

I love Komga and use it at home, and I thought it would be cool to learn what goes into making something like this myself. I opted to develop this in Rust to hopefully, at the end of all this, create something just as if not almost as convenient but with a smaller footprint. *I also just want to practice Rust!*

## Roadmap / To-do List

Stump is early in development, so there is a LOT missing - gotta start somewhere though! These are my current end-goals with some current todos sprinkled in:

- [x] Create Stump docker image that can be used to run the server on my Raspberry Pi (or any other machine)
  - [x] Create Dockerfile for prod
    - make sure image is *small*, sitting at 2gb rn >:(
- [ ] Filesystem indexing of libraries
  - [ ] Walk through libraries and sync media to DB
    - [ ] based on checksums or just urls? not sure, both have pros and cons
    - [ ] log errors
- [ ] Full OPDS support
  - [ ] Test common OPDS clients like [Panels](https://panels.app), [Chunky](http://chunkyreader.com/), etc
    - [ ] Panels:
      - [x] can connect without authentication
      - [ ] can connect with authentication
      - [ ] can generate OPDS feeds for:
        - [x] catalogs
        - [ ] libraries
        - [x] series
      - [ ] can fetch book thumbnails
        - [x] cbr
        - [x] cbz
        - [ ] pdf
        - [ ] epub
      - [ ] Page streaming support
         - [x] cbr
         - [x] cbz
         - [ ] pdf
         - [ ] epub
- [ ] Develop frontend client (Svelte) for:
  - [ ] reading media (epub, pdf, cbr, cbz)
  - [ ] managing media
  - [ ] managing access
- [x] Serve frontend with Stump server
- [ ] P2P file sharing options somewhere?
- [ ] Add authentication system

I am very open to suggestions and ideas!

## Contributing

Contributions are very **encouraged** and **welcome**! Please open an issue prior to working on a bug or feature to let me know what you're interested in working on. Thanks!

## Getting Started

As stated, Stump is in _very_ early development. The web interface is not yet functional, and the API is not remotely stable.

To run the server:

```bash
# cargo install cargo-watch
cd server
cargo watch -x run
```

or just:

```bash
# cargo install cargo-watch
yarn server:dev
```

### Docker

TODO: figure out indexing when in a docker container. Probably just need to mount the directory.
TODO: publish image when ready :)

Once I publish an image, the following will get you up and running using docker:

```bash
docker create \
  --name=stump \
  --user 1000:1000 \
  -p 6969:6969 \
  -v ~/.stump:/home/stump/.stump \
  --restart unless-stopped \
  aaronleopold/stump
```

```bash
docker run stump
```

Until then, if you want to build and run the image yourself, you can do so with:

```bash
pnpm server:build:docker-alpine
docker run -v ~/.stump:/home/stump/.stump -p 6969:6969 stump
```