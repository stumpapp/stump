# Contributing

You can contribute by opening new issues or PRs. Do not make random PRs without talking with me first - to ensure nobody's time and effort is wasted, please follow the guidelines below.

## Guidelines

1. Check to see if an issue already exists relevant to your feature/topic
2. Create an issue (if an issue does not already exist) and express interest in working it (see the [issues](#issues) section below)
3. Create a fork of the repository.
4. Create a new feature branch **off of the `develop` branch** - _not_ `main`.
5. Add appropiate documentation, tests, etc, if necessary.
6. Ensure you have your code formatters properly configured (both Prettier and Rustfmt).
7. Once you've completed your changes, create a PR from your feature branch into `develop` - _not_ `main`.
8. Be sure to update your feature branch with any new changes **before** making the PR.
9. Follow the PR naming format to help ensure the changelog generator properly picks up your additions:

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

10. Stick around and make sure your PR passes all checks and gets merged!

## Issues

I don't have any strict guidelines for issues, but do please try and be as descriptive as possible. There are a few templates to help you out, but in general:

- If you're interested in working on an issue, please leave a comment so that I know you're interested.
- If you're opening an issue to request a feature, please try and explain why you think it would be a good addition to the project. If applicable, include example use cases.
- If you're opening an issue to report a bug, try to fill in the template as best you can. If you can, please include a minimal reproduction of the bug (video, code, etc).
- If you're not sure if an issue is relevant appropriate, e.g. if you have more of a question to ask, feel free to pop in the [Discord server](https://discord.gg/63Ybb7J3as) and ask!

**Please don't ghost an issue you've been assigned** - if you're no longer interested in working on it, that is totally okay! Just leave a comment on the issue so that I know you're no longer interested and I can reassign it to someone else. I will never be offended if you no longer want to work on an issue - I'm just trying to make sure that nobody's time and effort is wasted.

## A note on merging

I will not merge your PR until:

- It aligns with the [guidelines](#guidelines) outlined above
  - In most cases, any issues outside of a malformed PR name, I will not fix for you. If you're unsure how to fix it, ask for help. Stale PRs will be closed after 10 days.
- All checks pass
- At least one maintainer has reviewed your PR

All PRs to `develop` will be squashed. All PRs to `main` will be merge commits. This is to ensure that the commit history is clean and easy to follow, and to ensure that the changelog generator works properly.

Thanks for considering to contribute! :heart:
