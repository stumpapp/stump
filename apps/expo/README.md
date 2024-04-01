# Stump Mobile Application

This is the mobile application for the Stump. It is built with [Expo](https://expo.io/) and is currently in the very early stages of development.

## Getting Started 🚀

> Note: You need to have the Expo CLI installed, as well as the mobile SDKs (depending on where you want to run the app). See the [Expo docs](https://docs.expo.io/get-started/installation/) for more info.

1. Clone the repo
2. Follow the [developer guide](https://github.com/aaronleopold/stump#developer-guide-) at the root of the Stump monorepo
3. Start the mobile app and the server:

   To start the server and mobile app concurrently, you can use the following command:

   ```bash
   yarn dev:expo
   ```

   If you want to start the server and mobile app separately, you can use the following commands in two separate terminals:

   ```bash
   cargo run --package stump_server
   yarn workspace @stump/expo start --clear
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

You can find the high-level roadmap for the Stump mobile app in the [documentation](https://www.stumpapp.dev/guides/mobile/app#planned-features). For a more granular view of what is coming, you can also take a look at the [project board](https://github.com/orgs/stumpapp/projects/8).

## Acknowledgements 🙏

- Thanks to [@dancamdev](https://github.com/dancamdev) for bootstrapping this Expo project template 🙌
- Thanks to [@LRotenberger](https://github.com/LRotenberger) for building out the initial POC for the mobile app 🚀
