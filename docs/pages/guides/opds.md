# OPDS

Open Publication Distribution System ([OPDS](https://opds.io/)) is a specification for generating and serving catalogs of digital content. It is used by many applications, such as [Panels](https://panels.app/) and [Chunky Reader](https://apps.apple.com/us/app/chunky-comic-reader/id663567628).

So long as an OPDS client _properly_ implements the OPDS specification, you should be able to use it with Stump. Each OPDS client might have a different way of collecting this information during their onboarding steps. If you have any trouble using your preferred client, please open an issue on [GitHub](https://github.com/stumpapp/stump/issues/new/choose) or feel free to pop into the [Discord](https://discord.gg/63Ybb7J3as) for help. This page can be updated with your findings to help others in the future.

## Supported OPDS Versions

Stump fully supports OPDS 1.2 and has experimental support for 2.0. At the time of writing, there are few clients which actually support 2.0, so it is difficult to test. If you have any experiences with OPDS 2.0, please consider updating this page with your findings!

### OPDS 1.2

The general structure of the URL to connect to your Stump server is:

`http(s)://your-server(:10801)(/baseUrl)/opds/v1.2/catalog`

#### Tested Clients

> **Note:** The ✨ emoji indicates a client which the developer of Stump personally uses

The following clients have been tested with Stump:

| OS      |                                      Application                                       | Page Streaming |               Issues/Notes |
| ------- | :------------------------------------------------------------------------------------: | -------------: | -------------------------: |
| iOS     |                             [Panels](https://panels.app/)                              |             ✅ |                         ✨ |
| iOS     |     [Chunky Reader](https://apps.apple.com/us/app/chunky-comic-reader/id663567628)     |             ✅ |                            |
| Android | [Moon+ Reader](https://play.google.com/store/apps/details?id=com.flyersoft.moonreader) |             ❌ | Users report OK experience |
| Android |                         [KyBook 3](http://kybook-reader.com/)                          |             ❌ |    No testing at this time |

If you have any experiences, good or bad, using any of these clients or another client not listed here, please consider updating this page with your findings.

### OPDS 2.0

The general structure of the URL to connect to your Stump server is:

`http(s)://your-server(:10801)(/baseUrl)/opds/v2.0/catalog`

#### Tested Clients

The following clients have been tested with Stump:

| OS  |                                    Application                                    | Page Streaming |                                                                                                                         Issues/Notes |
| --- | :-------------------------------------------------------------------------------: | -------------: | -----------------------------------------------------------------------------------------------------------------------------------: |
| iOS | [Cantook by Aldiko](https://apps.apple.com/us/app/cantook-by-aldiko/id1476410111) |             ❓ | Supports catalog traversal and media downloads. Issues with rendering media covers, however this appears to be an issue on their end |
