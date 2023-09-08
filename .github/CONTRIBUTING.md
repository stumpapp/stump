# Contributing

To ensure nobody's time and effort is wasted, please be sure to follow the guidelines below.

## Guidelines

1. Check to see if an issue already exists relevant to your feature/topic
2. Create an issue (if an issue does not already exist) and express interest in working it (see the [issues](#issues) section below)
3. Create a new feature branch **off of the `develop` branch** - _not_ `main`. All PRs should be made against `develop`.
4. Add appropiate documentation, tests, etc, if necessary.
5. Ensure you have your code formatters properly configured (both Prettier and Rustfmt).
6. Once you've completed your changes, create your PR!
7. Follow the PR naming format to help ensure the changelog generator properly picks up your additions:

   > :information_source: Honestly, don't stress about this part right now. I don't even have a changelog generator!! This kind of structure will only matter once releases are more regular and providing changelogs are more important. For now, just make sure your PR name and body is descriptive and concise :heart:

   ```
   <type>: <description>
   ```

   Where `type` is one of the following:

   - `feat`: A new feature
   - `fix`: A bug fix
   - `docs`: Documentation only changes
   - `refactor`: A code change that neither fixes a bug nor adds a feature
   - `perf`: A code change that improves performance
   - `test`: Adding missing tests or correcting existing tests
   - `ci`: Changes to our CI configuration files and scripts
   - `chore`: Other changes that don't modify `src` or `test` files, such as updating `package.json` or `README.md`
   - `revert`: Reverts a previous commit
   - `WIP`: Work in progress

   The `description` should contain a _succinct_ description of the change:

   - use the imperative, present tense: "change" not "changed" nor "changes"
   - don't capitalize the first letter
   - no dot (.) at the end

   Examples:

   ```
   feat: add support for Reading Lists
   fix: remove broken link
   docs: update CONTRIBUTING.md to include PR naming format
   ```

8. Stick around and make sure your PR passes all checks and gets merged!

## Issues

I use GitHub issues to track bugs, feature requests, and other tasks. No rigid structure is enforced, but please try and follow these guidelines:

- Please try and be as descriptive as possible when opening an issue.
- There are a few templates available to help guide you, but if you're not sure which one to use just use the "Blank Issue" template.
  - If you're opening an issue to request a feature, please try and explain why you think it would be a good addition to the project. If applicable, include example use cases.
  - If you're opening an issue to report a bug, please try and include a minimal reproduction of the bug (video, code, logs, etc).
  - If you're not sure if an issue is relevant or appropriate, e.g. if you have more of a question to ask, feel free to pop in the [Discord](https://discord.gg/63Ybb7J3as) and ask!
- **Please don't ghost an issue you've been assigned** - if you're no longer interested in working on it, that is totally okay! Just leave a comment on the issue so that I know you're no longer interested and I can reassign it to someone else. I will never be offended if you no longer want to work on an issue - I'm just trying to make sure that nobody's time and effort is wasted.

## A note on merging

PRs will be merged once the following criteria are met:

- All CI checks pass
- At least one _maintainer_ has reviewed your PR

All PRs to `develop` will be squashed. All PRs to `main` will be merge commits. This is to ensure that the commit history is clean and easy to follow, and to ensure that the changelog generator works properly.

Thanks for considering contributing to Stump! :heart:
