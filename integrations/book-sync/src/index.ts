import { Api, isAxiosError } from '@stump/sdk'
import chokidar from 'chokidar'

import { getConfig } from './config'
import { getRemotePath } from './utils'

const { basePaths, watchRoot, remoteIsUnix, ...apiConfig } = getConfig()

const sdk = new Api({
	...apiConfig,
	authMethod: 'api-key',
})

const checkForBook = async (path: string) => {
	const remotePath = getRemotePath(path, basePaths, { outputUnix: remoteIsUnix })
	try {
		await sdk.media.getByPath(remotePath)
		return true
	} catch (e) {
		if (isAxiosError(e) && e.response?.status === 404) {
			return false
		} else {
			throw e
		}
	}
}

// TODO: On first start, we should check for any files that are not in the Stump library and upload them immediately

const watcher = chokidar.watch(watchRoot, {
	ignored: /(^|[/\\])\../,
	persistent: true,
})

watcher.on('add', async (path) => {
	const exists = await checkForBook(path)
	if (!exists) {
		// Note: The logic here would be more complex, e.g. if you need to create a series, but this is the basic idea
		// await sdk.upload.uploadBook(path)
	}
})

// watcher.on('change', async (path) => {
// 	// Some more advanced logic to determine if we should re-upload? Currently not supported.
// })
