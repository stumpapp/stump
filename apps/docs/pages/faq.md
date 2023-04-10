# FAQ

## What is Stump?

Stump is an open source, self hostable, media server for your comic books, manga, and other digital books. It is designed to be _easy to use_ and _easy to deploy_.

The short on how it works:

- Install and run Stump on a computer or NAS (Network Attached Storage).
- Configure your libraries (i.e. _where your media lives_), and Stump will take care of the rest.
- To read your media, you can use the web interface or any compatible client.

## What isn't Stump?

Stump **is not** a tool used for fetching or downloading any kind of media. It is a tool used to host and access **your own media**. You may think of it like a Plex server for your comic books/manga/etc. If you are unfamiliar with Plex, you can think of Stump as a personal Netflix, for comic books/manga/etc, that lives on a computer in your home (like a NAS).

## Why Stump?

There are some really solid, self-hostable, OPDS media servers out there. I've personally used [Komga](https://komga.org) the most. I started developing Stump becuase I thought it would be cool to learn what goes into making something like Komga myself.

In general, Stump strives to achive the following:

- Tiny footprint (~24MB compressed Docker image, ~36.8 MB compiled executable)
- Efficiency and performance, even on less powerful hardware (e.g. Raspberry Pi)
- Intuitive and easy to use interface
- Enable a broad usage, supporting comics, managa, and other digital book formats (e.g. PDF, EPUB, CBZ/CBR)

## What's compatibility like?

Stump works on all major browsers and operating systems.

The hardware requirements vary and should serve **only as a guide**. Generally speaking, 1GB of RAM and disk space is more than enough. Stump also runs well on low-powered ARM-based single board computers, such as a Raspberry Pi.

**This section will be revisited once the first beta release is out.**

## What is on the roadmap?

The current `0.1.0` release roadmap can be found on [GitHub](https://github.com/aaronleopold/stump/issues/107). That linked ticket outlines the major features planned for the first release candidate of Stump. In general, you can expect the following features for `0.1.0`:

- Full OPDS + OPDS Page Streaming support
- EPUB and CBZ/CBR support
  - PDF support planned for `0.2.0`
- Customizable configuration (for both Docker and local hosting)
- Scheduled and invokable filesystem indexing/scanning
- Support for a range of metadata operations (e.g. adding/removing tags, changing metadata, etc.)
- Configurable CBR-to-CBZ conversion
- Integrated web UI and optional desktop application
  - Server management through UI settings
    - Live feed of server logs planned for `0.2.0`
  - Built-in webreaders for media
- Basic role-based access control (RBAC)
  - Controlled, fine-grained access planned for `0.2.0`
- Multi-language support

If you're interested in tracking the broader development of features, you can take a look at the GitHub [task board](https://github.com/users/aaronleopold/projects/2).

## Benchmarks

TODO

## Similar Projects

There are a number of other projects that are similar to Stump, it certainly isn't the first or only digital book media server out there. If Stump isn't for you, or you want to check out similar projects in the rust and/or self hosting spaces, consider checking out these other open source projects:

- [Komga](https://github.com/gotson/komga)
- [Kavita](https://github.com/Kareadita/Kavita)
- [audiobookshelf](https://github.com/advplyr/audiobookshelf) (_Audio books, Podcasts_)
- [Dim](https://github.com/Dusk-Labs/dim) (_Video, Audio_) (✨*Rust*✨)

## More questions?

If you want to know more about how to use, configure or set up Stump, be sure to review the [Getting Started](/installation) guide. Otherwise, if you have any other questions, or want to report any issues, please feel free to let us know on [GitHub](https://github.com/aaronleopold/stump/issues/new/choose) or by joining our [Discord](https://discord.gg/63Ybb7J3as) server for support.
