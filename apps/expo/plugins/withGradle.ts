import { type ExpoConfig } from 'expo/config'

import withAndroidJetifier from './withAndroidJetifier'
import withCoreLibraryDesugaring from './withCoreLibraryDesugaring'

export default function withGradle(config: ExpoConfig) {
	const withJetifier = withAndroidJetifier(config)
	const withDesugaring = withCoreLibraryDesugaring(withJetifier)
	return withDesugaring
}
