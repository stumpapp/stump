import { withPodfile } from '@expo/config-plugins'
import { mergeContents } from '@expo/config-plugins/build/utils/generateCode'
import { type ExpoConfig } from 'expo/config'

const READIUM_SOURCE = 'https://github.com/readium/podspecs'
const READIUM_VERSION = '~> 3.11.1'

/**
 * adds the readium pods to the main app target, since the extraPods on expo build properties
 * doesn't let me specifiy a target
 * see https://docs.expo.dev/versions/latest/sdk/build-properties/#extraiospoddependency
 */
export default function withReadiumPods(config: ExpoConfig) {
	return withPodfile(config, (config) => {
		const targetName = config.modRequest.projectName
		const pods = ['ReadiumShared', 'ReadiumStreamer', 'ReadiumNavigator', 'ReadiumOPDS']
			.map((name) => `  pod '${name}', '${READIUM_VERSION}', :source => '${READIUM_SOURCE}'`)
			.concat(`  pod 'Minizip', :modular_headers => true`)
			.join('\n')

		config.modResults.contents = mergeContents({
			tag: 'stump-readium-pods',
			src: config.modResults.contents,
			newSrc: pods,
			anchor: new RegExp(`target ['"]${targetName}['"] do`),
			offset: 1,
			comment: '#',
		}).contents

		return config
	})
}
