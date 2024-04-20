# Contributing

To ensure nobody's time and effort is wasted, please be sure to follow the guidelines below.

## Guidelines

1. Check to see if an issue already exists relevant to your feature/topic
2. Create an issue (if an issue does not already exist) and express interest in working it (see the [issues](#issues) section below)
3. Create a new feature branch **off of the `experimental` or `develop` branches** - _not_ `main`. All PRs should be made against either `experimental` or `develop`.
4. Add appropiate documentation, tests, etc, if necessary.
5. Ensure you have your code formatters properly configured (both Prettier and Rustfmt).
6. Once you've completed your changes, create your PR!
7. Follow the PR naming format outlined at [gitmoji.dev](https://gitmoji.dev/specification), used for more uniform generation of release notes

   > :information_source: Don't stress too much about this part. Just make sure your PR name and body is descriptive and concise, :heart:

8. Stick around and make sure your PR passes all checks and gets merged!

## Issues

I use GitHub issues to track bugs, feature requests, and other tasks. No rigid structure is enforced, but please try to fill out the templates fully as best you can. Generally, it is useful to include the following information:

- Docker tag (or commit hash displayed in settings)
- Log output (server logs, browser console, etc)
- Access method (browser on host machine, mobile on network, etc)
- Network logs (network tab) and details (reverse proxy, VPN, etc)

If you're not sure if an issue is relevant or appropriate, e.g. if you have more of a question to ask, feel free to pop in the [Discord](https://discord.gg/63Ybb7J3as) and ask!

## Pull Requests

> :information_source: There are two development branches: `experimental` and `develop`. These correspond to the `experimental` and `nightly` tags on Docker Hub, respectively. In general, `experimental` is for large or breaking changes, while `develop` is for smaller, more incremental changes.

PRs will be merged once the following criteria are met:

- All CI checks pass
- At least one _maintainer_ has reviewed your PR

All PRs to `experimental` will be squashed. All PRs to `develop` from `experimental` and to `main` will be merge commits. This is to ensure that the commit history is clean and easy to follow, and to ensure that the changelog generator works properly.

Thanks for considering contributing to Stump! :heart:
