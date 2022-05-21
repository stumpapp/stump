---
title: FAQ
description: Common questions (and answers) about Stump
---

# FAQ

## Why Stump?

There are some really solid, self-hostable, OPDS media servers out there. The most notable probably being [Komga](https://komga.org). Komga is a phenomenal open source project, and frankly a great alternative. Stump is heavily influenced by Komga, striving to maintain all of the coveted features while also bringing about improvements in usability and performance.

Overall, Stump has a few key features:

- Tiny footprint (~41MB Docker image, ~TBD MB executable)
- Super performant, even on less powerful hardware (e.g. Raspberry Pi)
  - < 5s total time for an initial scan of a library with ~200 comics, tested on a Raspberry Pi 4
- Emphasis on UI and UX (i.e. it's pretty and easy to use)

## What is on the roadmap?

Below is a list of the major features Stump is targeting before the first beta release:

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

You can track the development of these targeted features [here](https://github.com/users/aaronleopold/projects/2). If you have any suggestions or ideas, feel free to reach out!

## More questions?

If you want to know more about how to use, configure or set up Stump, be sure to review the [Getting Started](/installation) guide. Otherwise, if you have any other questions, or want to report any issues, please feel free to let us know on [GitHub](https://github.com/aaronleopold/stump/issues/new/choose) or by joining our [Discord](https://discord.gg/63Ybb7J3as) server for support.
