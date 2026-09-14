import { withAppBuildGradle } from '@expo/config-plugins'
import { type ExpoConfig } from 'expo/config'

/**
 * Forces `kotlinx-datetime` to 0.6.1 in the debug configuration
 */
export default function withKotlinxDatetimeResolution(config: ExpoConfig) {
	return withAppBuildGradle(config, (config) => {
		if (config.modResults.contents.includes('kotlinx-datetime-resolution')) {
			return config
		}

		const androidBlock = '\nandroid {'
		const insertIndex = config.modResults.contents.indexOf(androidBlock)

		if (insertIndex === -1) {
			console.warn('Could not find android block in build.gradle!')
			return config
		}

		// expo-dev-launcher pulls kotlinx-datetime 0.7.1 which breaks readium pulling in 0.6.1 since the `Instant`
		// class was removed in favor of a typealias. this manifests in an error like:
		// `java.lang.NoClassDefFoundError: Failed resolution of: Lkotlinx/datetime/Instant`
		// so in debug we force 0.6.1, this should be fine since it doesn't matter in release builds
		const resolutionBlock = `
configurations.configureEach {
    if (name.toLowerCase().contains("debug")) {
        resolutionStrategy.force "org.jetbrains.kotlinx:kotlinx-datetime:0.6.1"
    }
}
`

		config.modResults.contents =
			config.modResults.contents.slice(0, insertIndex) +
			resolutionBlock +
			config.modResults.contents.slice(insertIndex)

		return config
	})
}
