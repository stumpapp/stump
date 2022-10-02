# Installing Stump from source

If you want to install Stump directly from source, you will need to follow the developers guide outlined in the [contributing](/contributing) section of this documentation. This guide will walk you through the process of setting up your development environment, and getting Stump up and running.

Once you have finished that setup process, you can run the following command to build Stump locally:

```bash
pnpm build:web # build:desktop for the desktop app
```

This will bundle the web application and build the Stump core, located in the `target/release` directory (relative to the root of the project). You can place the following files anywhere you want, and run the main `stump` executable to start the Stump server:

- `stump`
- `client`
