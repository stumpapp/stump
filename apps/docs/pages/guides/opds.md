# Using other OPDS clients

Stump is compatible with any OPDS client that _properly_ implements the OPDS specification. The general structure of the URL to connect to your Stump server is:

`http(s)://your-server(:10801)(/baseUrl)/opds/v1.2/catalog`

For example, if you are running Stump on your local machine, with the default port and base URL, the URL would be:

`http://localhost:10801/opds/v1.2/catalog`

Each OPDS client might have a different way of collecting this information during their onboarding steps. If you have any trouble using your preferred client, please open an issue on [GitHub](https://github.com/stumpapp/stump/issues/new/choose) or feel free to pop into the Stump [Discord](https://discord.gg/63Ybb7J3as) server and ask for help.

## Tested OPDS clients

The following clients have been tested with Stump:

| OS      |                                      Application                                       | Page Streaming | Issues/Notes |
| ------- | :------------------------------------------------------------------------------------: | -------------: | -----------: |
| iOS     |                             [Panels](https://panels.app/)                              |             ✅ |              |
| iOS     |     [Chunky Reader](https://apps.apple.com/us/app/chunky-comic-reader/id663567628)     |             ✅ |              |
| Android | [Moon+ Reader](https://play.google.com/store/apps/details?id=com.flyersoft.moonreader) |             ❌ |              |
| Android |                         [KyBook 3](http://kybook-reader.com/)                          |             ❌ |              |

If you have any experiences, good or bad, using any of these clients or another client not listed here, please consider updating this page with your findings.
