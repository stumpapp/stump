# Source Code Installation

If you want to install Stump directly from source, follow the steps outlined in the [developer guide](/contributing), as it very closely aligns with this installation process.

Afterwards, you can run the following command to build Stump locally:

```bash
yarn web build && cargo build --package stump_server --release
```

This will bundle the web application and build the Stump server. The server binary is located at `target/release/stump_server`, and the web bundle at `apps/web/dist`. You can place those two items anywhere you'd like, just be sure they are either next to each other or you have set the appropriate [environment variable](/guides/configuration#stump_client_dir).
