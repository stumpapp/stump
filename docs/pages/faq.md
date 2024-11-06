# FAQ

## What is Stump?

Stump is an open source, self hostable, media server for digital books (ebooks, comic books, manga, etc). It is designed to be _easy to use_ and _easy to deploy_.

The short on how it works:

- Install and run Stump on a computer or NAS (Network Attached Storage).
- Configure your libraries (i.e. _where your media lives_), and Stump will take care of the rest.
- To read your media, you can use the web interface or any compatible client.

## What isn't Stump?

Stump **is not** a tool used for fetching or downloading any kind of media. It is a tool used to host and access **your own media**. You may think of it like a Plex server for your comic books/manga/etc. If you are unfamiliar with Plex, you can think of Stump as a personal Netflix, for comic books/manga/etc, that lives on a computer in your home (like a NAS).

## Why Stump?

There are some really solid, self-hostable, OPDS media servers out there. I started out using [Komga](https://komga.org). I initially started developing Stump because I thought it would be cool to learn what goes into making something like Komga myself.

In general, Stump strives for the following:

- Small footprint and low resource usage
- Efficiency and performance, even on less powerful hardware (e.g., Raspberry Pi)
- Intuitive, pretty, and easy to use interface
- Wide format support (e.g., PDF, EPUB, CBZ/CBR)

## What's compatibility like?

Stump _will_ work on all major browsers and operating systems.

The hardware requirements vary and should serve **only as a guide**. Generally speaking, 1GB of RAM and disk space is more than enough. Stump also runs well on low-powered ARM-based single board computers, such as a Raspberry Pi.

**This section will be revisited once the first beta release is out.**

## Can I try it out?

I am working on setting up a public demo instance. If it is available, you will find it at [demo.stumpapp.dev](https://demo.stumpapp.dev). The login credentials are:

- **Username:** `demouser`
- **Password:** `demouser10801`

## What is on the roadmap?

Take a look at the [GitHub Projects](https://github.com/orgs/stumpapp/projects) to see what is currently being worked on and what is planned for the future.

If you're interested in tracking the broader development of individual or otherwise isolated features, you can take a look at [GitHub issues](https://github.com/stumpapp/stump/issues).

## More questions?

If you want to know more about how to use, configure or set up Stump, be sure to review the [installation guide](/installation). Otherwise, if you have any other questions, or want to report any issues, please feel free to let us know on [GitHub](https://github.com/stumpapp/stump/issues/new/choose) or by joining our [Discord](https://discord.gg/63Ybb7J3as) server for support.
