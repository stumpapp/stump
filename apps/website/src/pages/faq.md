---
title: FAQ
description: Common questions (and answers) about Stump
---

# FAQ

## Why Stump?

There are some really solid, self-hostable, OPDS media servers out there. I've personally used [Komga](https://komga.org) the most - a phenomenal open source project, and frankly a great alternative. I started developing Stump becuase I thought it would be cool to learn what goes into making something like Komga myself. Stump is therefore heavily influenced by Komga, striving to maintain all of its coveted features while also bringing about improvements in usability and performance.

Overall, Stump has a few key features:

- Tiny footprint (~45MB compressed Docker image, ~36.8 MB compiled executable)
- Super performant, even on less powerful hardware (e.g. Raspberry Pi)
- Strong emphasis on UI and UX (i.e. it's pretty and easy to use)
- Broader usage (i.e. it's for more than _just_ comics and manga)

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

If you're interested in tracking the development of specific features, you can take a look at the [V1 Project Board](https://github.com/users/aaronleopold/projects/2). If you have any suggestions or ideas, feel free to reach out!

## Benchmarks

Unfortunately I don't own all of the machines/libraries outlined below. So, the benchmarks are not a complete and full combination of all the available scenarios.

**Computers**:

1. 2021 Macbook Pro 14" (M1 Pro, 32GB RAM, SSD)
2. Raspberry Pi 4 (8GB RAM, SSD)

**Test Libraries**:

1. Small: 2 libraries, 15 series, 300 books (10GB)
2. Medium: TODO
3. Large: X libraries, Y series, 89,000 books

**Test Scenarios**:

1. New server initial scan (i.e. everything gets added to DB)
2. Consecutive scan
3. Query books with varying page sizes
4. Query books with varying page sizes AND ordering

TODO: FOR ALL SCENARIOS DO THE FOLLOWING:

- measure average memory usage
- measure CPU usage
- measure failure rate
- measure total time taken
- compare SSD/HDD
- test network drive

TODO

## Similar Projects

There are a number of other projects that are similar to Stump, it certainly isn't the first or only digital book media server out there (_heck, it isn't even in beta yet_)! If Stump isn't for you, or you want to check out similar projects in the rust and/or self hosting spaces, consider checking out these other open source projects:

- [Komga](https://github.com/gotson/komga)
- [Kavita](https://github.com/Kareadita/Kavita)
- [audiobookshelf](https://github.com/advplyr/audiobookshelf) (_Audio books, Podcasts_)
- [Dim](https://github.com/Dusk-Labs/dim) (_Video, Audio_) (✨*Rust*✨)

## More questions?

If you want to know more about how to use, configure or set up Stump, be sure to review the [Getting Started](/installation) guide. Otherwise, if you have any other questions, or want to report any issues, please feel free to let us know on [GitHub](https://github.com/aaronleopold/stump/issues/new/choose) or by joining our [Discord](https://discord.gg/63Ybb7J3as) server for support.
