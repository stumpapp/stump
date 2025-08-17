import { useSDK, useSuspenseGraphQL } from '@stump/client'
import { graphql } from '@stump/graphql'

import { useActiveServer } from '../activeServer'
import StackedEffectThumbnail from '../StackedEffectThumbnail'

// TODO: Add thumbnail
const query = graphql(`
	query StackedSmartListThumbnails {
		smartLists {
			id
			# thumbnail {
			# 	url
			# }
		}
	}
`)

export default function StackedSmartListThumbnails() {
	const { sdk } = useSDK()
	const {
		activeServer: { id: serverID },
	} = useActiveServer()

	const {
		data: {
			smartLists: [list],
		},
	} = useSuspenseGraphQL(query, ['stackedSmartListThumbnails'])
	const listID = list?.id || ''
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
