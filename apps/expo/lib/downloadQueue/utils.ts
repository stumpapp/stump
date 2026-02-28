import { AddDownloadRelations } from '~/db'

import { DownloadQueueMetadata } from './types'

export function downloadMetaIntoDownloadRelations(
	metadata?: DownloadQueueMetadata | null,
): AddDownloadRelations | undefined {
	if (!metadata) return undefined

	return {
		seriesRef:
			metadata.seriesId && metadata.seriesName
				? {
						id: metadata.seriesId,
						name: metadata.seriesName,
						libraryId: metadata.libraryId,
					}
				: undefined,
		libraryRef:
			metadata.libraryId && metadata.libraryName
				? { id: metadata.libraryId, name: metadata.libraryName }
				: undefined,
		existingProgression: metadata.readProgress,
	}
}
