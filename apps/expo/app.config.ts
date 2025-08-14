import type { ConfigContext, ExpoConfig } from 'expo/config'

export default ({ config }: ConfigContext): ExpoConfig => {
	const initialConfig: ExpoConfig = {
		...config,
		name: 'Stump',
		slug: 'stump',
		version: '0.0.0',
		orientation: 'portrait',
		icon: './assets/images/icon.png',
		scheme: 'stump',
		userInterfaceStyle: 'automatic',
		newArchEnabled: true,
		assetBundlePatterns: ['**/*'],
		ios: {
			supportsTablet: true,
			bundleIdentifier: 'com.stumpapp.stump',
			icon: {
				light: './assets/images/ios-light.png',
				dark: './assets/images/ios-dark.png',
				tinted: './assets/images/ios-tinted.png',
			},
			infoPlist: {
				ITSAppUsesNonExemptEncryption: false,
				NSAppTransportSecurity: {
					NSAllowsArbitraryLoads: true,
				},
			},
		},
		android: {
			adaptiveIcon: {
				foregroundImage: './assets/images/android-adaptive.png',
				monochromeImage: './assets/images/android-monochrome.png',
				backgroundColor: '#ffffff',
			},
			package: 'com.stumpapp.stump',
		},
		androidNavigationBar: {
			visible: 'immersive',
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
			[
				'expo-font',
				{
					fonts: [
						'assets/fonts/Atkinson-Hyperlegible-Bold.ttf',
						'assets/fonts/Atkinson-Hyperlegible-BoldItalic.ttf',
						'assets/fonts/Atkinson-Hyperlegible-Italic.ttf',
						'assets/fonts/Atkinson-Hyperlegible-Regular.ttf',
						'assets/fonts/Bitter-Italic-VariableFont_wght.ttf',
						'assets/fonts/Bitter-VariableFont_wght.ttf',
						'assets/fonts/CharisSIL-Bold.ttf',
						'assets/fonts/CharisSIL-BoldItalic.ttf',
						'assets/fonts/CharisSIL-Italic.ttf',
						'assets/fonts/CharisSIL-Regular.ttf',
						'assets/fonts/Literata-Italic[opsz,wght].ttf',
						'assets/fonts/Literata[opsz,wght].ttf',
						'assets/fonts/OpenDyslexic-Bold-Italic.otf',
						'assets/fonts/OpenDyslexic-Bold.otf',
						'assets/fonts/OpenDyslexic-Italic.otf',
						'assets/fonts/OpenDyslexic-Regular.otf',
					],
				},
			],
			[
				'expo-build-properties',
				{
					android: {
						usesCleartextTraffic: true,
						compileSdkVersion: 35,
						targetSdkVersion: 35,
					},
				},
			],
			[
				'expo-splash-screen',
				{
					backgroundColor: '#F4E8E0',
					dark: {
						backgroundColor: '#000000',
					},
					android: {
						image: './assets/images/splash-icon.png',
					},
				},
			],
		],
		owner: 'stumpapp',
		experiments: {
			typedRoutes: true,
		},
		extra: {
			eas: {
				projectId: 'b1069238-5814-4263-983b-148216e393e5',
			},
		},
	}

	return initialConfig
}
