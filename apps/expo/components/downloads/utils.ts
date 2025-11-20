import { thumbnailsDirectory } from '~/lib/filesystem'
import StumpStreamer from '~/modules/streamer'

import { DownloadedFile } from './types'

export const getThumbnailPath = (downloadedFile: DownloadedFile): string | null => {
	return downloadedFile.thumbnailPath
		? `file://${downloadedFile.thumbnailPath.replace('file://', '')}`
		: StumpStreamer.getThumbnailPath(
				downloadedFile.id,
				thumbnailsDirectory(downloadedFile.serverId),
			)
}
