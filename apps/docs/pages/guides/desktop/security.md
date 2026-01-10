# Security

An overview of security-related topics unique to the desktop app

## Authentication

The desktop app uses token-based authentication when authenticating against and communicating with the Stump server. The web app which you're accustomed to in the browser uses session-based authentication. Due to platform inconsistencies with cookies, this was a necessary change to ensure the desktop app could communicate with the server.

There are generally two options when configuring a server which the desktop app can connect to:

1. Login - You will be prompted to login whenever a token expires. No credentials are stored, only tokens
2. Silent - The app will automatically attempt to refresh the token in the background without prompting the user. This means your credentials are stored securely and used automatically when needed.

### Token Storage

The access and refresh tokens are stored using your native platform's secure storage mechanism. On Windows, this is the Credential Manager, on macOS it is the Keychain, and on Linux it is the Secret Service. Because of this, you might be prompted to give Stump permission to access these services. The [keyring](https://docs.rs/keyring/latest/keyring/) library is used to interact with these secure stores.

This is a necessary step to ensure your token is stored securely, as opposed to storing it somewhere in app memory. This helps to mitigate some of the common attack vectors that could be used to steal and maliciously use your token, such as JavaScript exploitation from crafted ebooks.

### Credential Storage

Any credentials are stored in the same, secure manner as tokens are. Stump does not request them unless explicitly needed for a silent, background reauth.

## Debug Builds

At the moment, all desktop builds are debug. This means that a developer console is available to you, which while convenient for debugging, could be used maliciously to exploit the app. This is a known issue, however will be resolved when the app is stable and non-debug builds are available.

## macOS Quirks

macOS has some unique security features that are worth mentioning:

### Remote Access

macOS has hardened restrictions on what URLs an app can successfully connect to. This means that non-local IP addresses are **actively blocked** by the app. This is unfortunately an unavoidable limitation imposed by Apple, and is not something that can be worked around. So if you are running a server and wish to connect to it **remotely**, you will have to configure a domain with the appropriate SSL certificates to connect to it.

### App Signing (lack thereof)

The desktop app is not signed, which means that macOS will likely flat out refuse to run it. This will hopefully be resolved in the future by signing the app, however since getting a developer license comes at a yearly-recurring cost it is not a priority or feasible at the moment.

To get around this, you can force macOS to accept the risk by running the following command in Terminal:

```bash
xattr -c /Applications/Stump.app
```

While I obviously don't have malicious intent, I still have to say: **do at your own risk**.
