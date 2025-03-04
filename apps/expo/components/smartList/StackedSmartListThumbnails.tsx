import { useSDK, useSmartListsQuery } from '@stump/client'

import { useActiveServer } from '../activeServer'
import StackedEffectThumbnail from '../StackedEffectThumbnail'

export default function StackedSmartListThumbnails() {
	const { sdk } = useSDK()
	const {
		activeServer: { id: serverID },
	} = useActiveServer()

	// TODO: pagination/cursor/limit
	const { lists } = useSmartListsQuery({
		params: {
			mine: true,
		},
		suspense: true,
	})

	const listID = lists?.[0]?.id || ''
	const thumbnailURL = sdk.smartlist.thumbnailURL(listID)

	if (!listID) {
		return null
	}

	return (
		<StackedEffectThumbnail
			label="Smart Lists"
			uri={thumbnailURL}
			href={`/server/${serverID}/smart-lists`}
		/>
	)
}
