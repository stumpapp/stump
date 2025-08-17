# Stump Mobile App

This is the expo mobile app for Stump. The app runs on both iOS and Android.

## Getting Started

To get started with local development, the biggest barrier is setting up the native modules. The app uses the Swift and Kotlin [Readium](https://github.com/readium/mobile) toolkit for native EPUB parsing/rendering.

### Native Development

The process differs slightly between iOS and Android.

#### iOS

To build the app for iOS, run the following command:

```bash
yarn ios
```

This should generate a development build of the app and start the dev server. You can then run the app on an iOS simulator or device. Once you have a build, you may also run `yarn dev` to just start the app without triggering a new build.

To open the Xcode project, run:

```bash
yarn open:ios
```

You can edit the native code in `Pods` -> `Development Pods` -> `Readium`

#### Android

Ensure you follow the official [Expo](https://docs.expo.dev/workflow/android-studio-emulator/#install-watchman-and-jdk) guide to set up your Android development environment.

To build the app for Android, run the following command:

```bash
yarn android # expo run:android
```

This should generate a development build of the app and start the dev server. You can then run the app on an Android emulator or device. Once you have a build, you may also run `yarn android` to just start the app without triggering a new build.

To open in Android Studio, run:

```bash
yarn open:android
```

You can edit the native code in `android` -> `readium` -> `src/main/java/expo.modules.readium`

##### Generating an APK

To generate an APK for the app, just use the `apk` profile:

```bash
eas build --profile apk --platform android --local
```

## License 📝

The `expo` app is licensed under [GPL-3.0](https://www.gnu.org/licenses/gpl-3.0.html)
