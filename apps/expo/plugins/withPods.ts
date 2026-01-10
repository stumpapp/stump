import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

import { withDangerousMod } from '@expo/config-plugins'
import { mergeContents } from '@expo/config-plugins/build/utils/generateCode'
import { type ExpoConfig } from 'expo/config'

export default function withPods(config: ExpoConfig, options: { pods: string[] }) {
	return withDangerousMod(config, [
		'ios',
		async (config) => {
			const filePath = join(config.modRequest.platformProjectRoot, 'Podfile')
			const contents = await readFile(filePath, 'utf-8')
			const merged = mergeContents({
				tag: 'react-native-readium',
				src: contents,
				newSrc: options.pods.map((pod) => `  ${pod}`).join('\n'),
				anchor: /use_native_modules/,
				offset: 0,
				comment: '#',
			})

			if (merged.didMerge || merged.didClear) {
				await writeFile(filePath, merged.contents)
			}

			return config
		},
	])
}
