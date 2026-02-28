import { NativeIntent } from 'expo-router'

import { IMPORTABLE_EXTENSIONS } from '~/lib/localLibrary'

// See https://docs.expo.dev/router/advanced/native-intent/
export const redirectSystemPath: NativeIntent['redirectSystemPath'] = ({ path }) => {
	const lowerPath = path.toLowerCase()

	const isFileImport = IMPORTABLE_EXTENSIONS.some((ext) => lowerPath.includes(`.${ext}`))

	if (isFileImport) {
		return '/'
	}

	return path
}
