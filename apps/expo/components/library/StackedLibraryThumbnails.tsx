import { useLibraries, useSDK } from '@stump/client'

import { useActiveServer } from '../activeServer'
import StackedEffectThumbnail from '../StackedEffectThumbnail'

export default function StackedLibraryThumbnails() {
	const { sdk } = useSDK()
	const {
		activeServer: { id: serverID },
	} = useActiveServer()
	const { libraries } = useLibraries({
		page_size: 1,
		suspense: true,
	})

	const libraryID = libraries?.[0]?.id || ''
	const thumbnailURL = sdk.library.thumbnailURL(libraryID)

	if (!libraryID) {
		return null
	}

	return (
		<StackedEffectThumbnail
			label="Libraries"
			uri={thumbnailURL}
			href={`/server/${serverID}/libraries`}
		/>
	)
}
