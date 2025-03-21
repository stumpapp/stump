import { useSDK, useSeriesCursorQuery } from '@stump/client'

import { useActiveServer } from '../activeServer'
import StackedEffectThumbnail from '../StackedEffectThumbnail'

export default function StackedSeriesThumbnails() {
	const { sdk } = useSDK()
	const {
		activeServer: { id: serverID },
	} = useActiveServer()
	const { series } = useSeriesCursorQuery({
		limit: 1,
		suspense: true,
	})

	const seriesID = series?.[0]?.id || ''
	const thumbnailURL = sdk.series.thumbnailURL(seriesID)

	if (!seriesID) {
		return null
	}

	return (
		<StackedEffectThumbnail label="Series" uri={thumbnailURL} href={`/server/${serverID}/series`} />
	)
}
