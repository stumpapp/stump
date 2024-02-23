# Stump Mobile Application

This is the mobile application for the Stump. It is built with [Expo](https://expo.io/), and is currently in the very early stages of development.

## Getting Started 🚀

> Note: You need to have the Expo CLI installed, as well as the mobile SDKs (depending on where you want to run the app). See the [Expo docs](https://docs.expo.io/get-started/installation/) for more info.

1. Clone the repo
2. Follow the [developer guide](https://github.com/aaronleopold/stump#developer-guide-) at the root of the Stump monorepo
3. Start the mobile app and the server:

```bash
moon run server:start mobile:dev # or server:dev if you want to run the server in dev mode
```

And that's it!

## Contributing 🤝

Be sure to review the [CONTRIBUTING.md](https://github.com/aaronleopold/stump/tree/develop/.github/CONTRIBUTING.md) before getting started, as it overviews the guidelines and general process for contributing to the project. Once you've done that, it's as simple as:

1. Fork the repo
2. Create a new branch
3. Make your changes
4. Open a PR (following the title and description guidelines)
5. Wait for review
6. Merge 😍

## Roadmap 🗺️

With the `v0.1.0` release of the Stump server (very) slowly approaching, the mobile app has the following items targeted for an _initial POC_:

- [ ] Various initial expo-related project configuration:
  - [ ] Appropriate routing setup (e.g. tabs and stack navigators)
- [x] Configure and connect to a Stump server instance
- [x] Login or claim an unclaimed server instance
- [ ] A home screen that shows the server at a glance:
  - [x] Various server statistics
  - [ ] In progress media
  - [ ] Newly added series and books
- [ ] A library screen that shows a paginated list of series within a library
- [ ] A series screen that shows a pagination list of media within a series
- [ ] A very basic book overview screen
- [ ] Support barebones readers for:
  - [ ] Epub
  - [ ] CBZ/CBR
- [ ] Dark theme support

## Acknowledgements 🙏

- Thanks to [@dancamdev](https://github.com/dancamdev) for bootstrapping this Expo project 🙌
