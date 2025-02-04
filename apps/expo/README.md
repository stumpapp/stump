# Stump Mobile App

This is the expo mobile app for Stump. The app runs on both iOS and Android.

## Getting Started

To get started with local development, the biggest barrier is setting up the native modules. The app uses the Swift and Kotlin [Readium](https://github.com/readium/mobile) toolkit for native EPUB parsing/rendering.

### Native Development

The process differs slightly between iOS and Android.

#### iOS

To build the app for iOS, run the following command:

```bash
yarn prebuild:ios
```

This should build the app and generate an Xcode project in the `expo` directory.

You should now be able to run:

```bash
yarn ios --dev-client
```

To open the Xcode project, run:

```bash
yarn open:ios
```

You can edit the native code in `Pods` -> `Development Pods` -> `Readium`

#### Android

<!-- For whatever reason, `yarn prebuild:android` didn't work for me. Instead, I had to kick off a local eas build. -->

To build the app for Android, run the following command:

```bash
eas build --profile development --platform android --local
```

This should build the app and generate an APK file in the `expo` directory. You can then install the APK on an Android device or emulator:

```bash
adb install --user 0 /path/to/apk
```

At this point, you can now run the dev client with the native modules installed:

```bash
yarn android --dev-client
```

To open in Android Studio, run:

```bash
yarn open:android
```

You can edit the native code in `android` -> `readium` -> `src/main/java/expo.modules.readium`
