import { thumbnailsDirectory } from '~/lib/filesystem'
import StumpStreamer from '~/modules/streamer'

import { DownloadedFile } from './types'

export const getThumbnailPath = (downloadedFileId: DownloadedFile): string | null => {
	return StumpStreamer.getThumbnailPath(
		downloadedFileId.id,
		thumbnailsDirectory(downloadedFileId.serverId),
	)
}
