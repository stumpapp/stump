import { NativeIntent } from 'expo-router'

// See https://docs.expo.dev/router/advanced/native-intent/
export const redirectSystemPath: NativeIntent['redirectSystemPath'] = ({ path }) => {
	// content:// and file:// URIs (e.g. from "Open with Stump") rarely contain a
	// literal extension in the path, so we can't rely on extension matching here.
	// Actual format validation happens in importLocalFile once the file is resolved.
	const isFileImport = path.startsWith('content://') || path.startsWith('file://')

	if (isFileImport) {
		return '/'
	}

	if (path.startsWith('stump://')) {
		const result = '/' + path.slice('stump://'.length)
		return result
	}

	return path
}
