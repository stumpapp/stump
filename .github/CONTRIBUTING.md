# Contributing

To ensure nobody's time and effort is wasted, please be sure to follow the guidelines below.

## Guidelines

1. Check to see if an issue already exists relevant to your feature/topic. Please also check the [documentation](https://www.stumpapp.dev) to see if there is already information about your topic.
2. Create an issue (if an issue does not already exist) and express interest in working it (see the [issues](#issues) section below)
3. Create a new feature branch **off of the `nightly` branch**. Please do not base contributions on `main`. All PRs should be made against `nightly`.
4. Add appropiate documentation, tests, etc, if necessary.
5. Ensure you have your code formatters properly configured (both Prettier and Rustfmt).
6. Create the PR, following the naming convention outlined at [gitmoji.dev](https://gitmoji.dev/specification) if you can, it is used for more uniform generation of release notes

   > :information_source: Don't stress too much about this part. Just make sure your PR name and body is descriptive and concise 🫶

7. Stick around and make sure your PR passes CI

I want to emphasize the first two points in this list. The last thing I want is to waste anybody's time by working on something that might already be in progress or not a fit for the project.

### LLM-Generated Contributions (AI)

Stump is **not** a vibecoded project. I understand some people see the emojis and think it is, but really they just bring a silliness into the project that I enjoy (more people should embrace more silliness).

I write good (and bad) code with my own two hands. There are some areas of the code where AI was used at points in Stump's history, but after bettering my understanding of the ecological and ethical implications of using LLMs I have not used generative AI tools in the development of Stump since.

I understand that LLM-assisted contributions are a reality in the open source ecosystem today and largely unavoidable. While I will not outright reject contributions that have been generated with the help of LLMs, I ask that you please:

1. Be transparent about it in your PR. I can usually tell, but I appreciate the transparency
2. Put in time to review the work, don't just pass it off to me without quality checks
3. Be mindful of the implications of using these tools

If you do that, and have already burned the resources to generate the contribution, I won't just shut it down.

## Issues

I use GitHub issues to track bugs, feature requests, and other tasks. No rigid structure is enforced, but please try to fill out the templates fully as best you can. Generally, it is useful to include the following information:

- Docker tag (or commit hash displayed in settings)
- Log output (server logs, browser console, etc)
- Access method (browser on host machine, mobile on network, etc)
- Network logs (network tab) and details (reverse proxy, VPN, etc)

If you're not sure if an issue is relevant or appropriate, or would like to have a discussion about it first, feel free to:

- Start a discussion for the topic on GitHub
- Ask in the [Discord](https://discord.gg/63Ybb7J3as)

## Pull Requests

PRs will be merged once the following criteria are met:

- All CI checks pass
- At least one _maintainer_ has reviewed/approved your PR

If you do not wish for me to merge your PR after approval, please communicate that in the PR. Otherwise, I try to merge approved PRs in a timely manner.

Thanks for considering contributing to Stump! 🫶
