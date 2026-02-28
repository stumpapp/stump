import { thumbnailsDirectory, toAbsolutePath } from '~/lib/filesystem'
import StumpStreamer from '~/modules/streamer'

import { DownloadedFile } from './types'

export const getThumbnailPath = (downloadedFile: DownloadedFile): string | null => {
	return downloadedFile.thumbnailPath
		? `file://${toAbsolutePath(downloadedFile.thumbnailPath)}`
		: StumpStreamer.getThumbnailPath(
				downloadedFile.id,
				thumbnailsDirectory(downloadedFile.serverId),
			)
}
