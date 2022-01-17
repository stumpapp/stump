# Stump

A free and open source comics server with OPDS support, **heavily** inspired by [Komga](https://github.com/gotson/komga).

While I love Komga, I've found that it can be rather resource heavy on the little raspberry pi I host all my home media on. I thought it would be cool to learn what goes into making something like this, and opted to take advantage of the performance Rust has to hopefully, at the end of all this, create something just as convenient but with a smaller footprint.

## Roadmap

Stump is extremely early in development, so there is a LOT to get started - gotta start somewhere though! These are my current end-goals:

- [ ] Install on server directly or using docker image
  - [ ] Get docker working
- [ ] Walk through media directories and sync with DB (based on checksums?)
- [ ] Full OPDS support
  - [ ] Test common OPDS clients like [Panels](https://panels.app), [Chunky](http://chunkyreader.com/), etc
- [ ] Page streaming support
- [ ] Built-in, basic UI for library management
  - [ ] Write in Svelte
- [ ] P2P file sharing options somewhere?
- [ ] **Secure** connections only
  - What kind of authentication system best suits the apps needs?

I am unsure how configurable this project will wind up being. Should there be users and logins? Should there be access control features like IP whitelisting? I am very open to suggestions and ideas!

## Contributing

Contributions are **encouraged** and **welcome**! Please open an issue prior to working on a bug or feature to let me know what you're interested in working on. Thanks!

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
yarn dev:server
```
