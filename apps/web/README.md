# web

This is a React SPA served by the [Stump server](../server) by default. It is the primary management and general user interface for Stump.

The app itself is largely a slim wrapper around a [monolithic React component](../../packages/browser) that handles the core functionality of shared between the web-based interfaces.

## Testing

See [tests](./tests) for the playwright suite for the web app. A quick start includes:

```bash
# this assumes you have a Stump server up and running at port 10801
yarn install
# optional install step if you need to install playwright browsers
yarn e2e:install
yarn e2e
```
