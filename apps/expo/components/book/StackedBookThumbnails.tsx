import { useMediaCursorQuery, useSDK } from '@stump/client'

import { useActiveServer } from '../activeServer'
import StackedEffectThumbnail from '../StackedEffectThumbnail'

export default function StackedBookThumbnails() {
	const { sdk } = useSDK()
	const {
		activeServer: { id: serverID },
	} = useActiveServer()
	const { media } = useMediaCursorQuery({
		limit: 1,
		suspense: true,
	})

	const bookID = media?.[0]?.id || ''
	const thumbnailURL = sdk.media.thumbnailURL(bookID)

	if (!bookID) {
		return null
	}

	return (
		<StackedEffectThumbnail label="Books" uri={thumbnailURL} href={`/server/${serverID}/books`} />
	)
}
