import fs from 'node:fs'
import path from 'node:path'

import { withDangerousMod, withGradleProperties } from '@expo/config-plugins'
import { mergeContents } from '@expo/config-plugins/build/utils/generateCode'
import type { ConfigContext, ExpoConfig } from 'expo/config'

import packageInfo from './package.json'

const IS_DEV = process.env['APP_VARIANT'] === 'development'

export default ({ config }: ConfigContext): ExpoConfig => {
	const initialConfig: ExpoConfig = {
		...config,
		name: 'stump',
		slug: 'stump',
		version: '1.0.0',
		orientation: 'portrait',
		icon: './assets/images/icon.png',
		scheme: 'myapp',
		userInterfaceStyle: 'automatic',

		owner: 'stumpapp',
		newArchEnabled: true,
		splash: {
			image: './assets/images/splash.png',
			resizeMode: 'contain',
			backgroundColor: '#ffffff',
		},
		assetBundlePatterns: ['**/*'],
		ios: {
			supportsTablet: true,
			bundleIdentifier: 'com.stumpapp.stump',
		},
		android: {
			adaptiveIcon: {
				foregroundImage: './assets/images/adaptive-icon.png',
				backgroundColor: '#ffffff',
			},
			package: 'com.stumpapp.stump',
		},
		web: {
			bundler: 'metro',
			output: 'static',
			favicon: './assets/images/favicon.png',
		},
		plugins: [
			'expo-router',
			[
				'expo-secure-store',
				{
					configureAndroidBackup: true,
					faceIDPermission: 'Allow $(PRODUCT_NAME) to access your Face ID biometric data.',
				},
			],
		],
		experiments: {
			typedRoutes: true,
		},
		extra: {
			router: {
				origin: false,
			},
			eas: {
				projectId: 'b1069238-5814-4263-983b-148216e393e5',
			},
		},
	}

	// TODO: Determine which Readium modules are necessary for the app, e.g. OPDS probably not
	return withDangerousMod(initialConfig, [
		'ios',
		async (config) => {
			const filePath = path.join(config.modRequest.platformProjectRoot, 'Podfile')
			const contents = await fs.promises.readFile(filePath, 'utf-8')
			const merged = mergeContents({
				tag: 'react-native-readium',
				src: contents,
				newSrc: `  pod 'Minizip', modular_headers: true
  pod 'ZIPFoundation', '~> 0.9'
  pod 'R2Shared', podspec: 'https://raw.githubusercontent.com/readium/swift-toolkit/3.1.0/Support/CocoaPods/ReadiumShared.podspec'
  pod 'R2Streamer', podspec: 'https://raw.githubusercontent.com/readium/swift-toolkit/3.1.0/Support/CocoaPods/ReadiumStreamer.podspec'
  pod 'R2Navigator', podspec: 'https://raw.githubusercontent.com/readium/swift-toolkit/3.1.0/Support/CocoaPods/ReadiumNavigator.podspec'
  pod 'ReadiumAdapterGCDWebServer', podspec: 'https://raw.githubusercontent.com/readium/swift-toolkit/3.1.0/Support/CocoaPods/ReadiumAdapterGCDWebServer.podspec'
  pod 'ReadiumOPDS', podspec: 'https://raw.githubusercontent.com/readium/swift-toolkit/3.1.0/Support/CocoaPods/ReadiumOPDS.podspec'
  pod 'ReadiumInternal', podspec: 'https://raw.githubusercontent.com/readium/swift-toolkit/3.1.0/Support/CocoaPods/ReadiumInternal.podspec'
  pod 'Fuzi', podspec: 'https://raw.githubusercontent.com/readium/Fuzi/refs/heads/master/Fuzi.podspec'
  pod 'ReadiumGCDWebServer', podspec: 'https://raw.githubusercontent.com/readium/GCDWebServer/4.0.0/GCDWebServer.podspec', modular_headers: true
`,
				anchor: /use_native_modules/,
				offset: 0,
				comment: '#',
			})

			if (merged.didMerge || merged.didClear) {
				await fs.promises.writeFile(filePath, merged.contents)
			}

			return config
		},
	])
}
