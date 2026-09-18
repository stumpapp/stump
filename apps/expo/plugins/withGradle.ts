import { type ExpoConfig } from 'expo/config'

import withAndroidJetifier from './withAndroidJetifier'
import withCoreLibraryDesugaring from './withCoreLibraryDesugaring'
import withCustomGradleProperties from './withGradleProperties'
import withKotlinxDatetimeResolution from './withKotlinxDatetimeResolution'

export default function withGradle(config: ExpoConfig) {
	const withJetifier = withAndroidJetifier(config)
	const withDesugaring = withCoreLibraryDesugaring(withJetifier)
	const withGradleProps = withCustomGradleProperties(withDesugaring)
	const withDatetime = withKotlinxDatetimeResolution(withGradleProps)
	return withDatetime
}
