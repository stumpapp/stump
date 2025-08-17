import { useSuspenseGraphQL } from '@stump/client'
import { graphql } from '@stump/graphql'

import { useActiveServer } from '../activeServer'
import StackedEffectThumbnail from '../StackedEffectThumbnail'

const query = graphql(`
	query StackedBookThumbnails {
		media(pagination: { cursor: { limit: 1 } }) {
			nodes {
				id
				thumbnail {
					url
				}
			}
		}
	}
`)

export default function StackedBookThumbnails() {
	const {
		activeServer: { id: serverID },
	} = useActiveServer()
	const {
		data: {
			media: {
				nodes: [book],
			},
		},
	} = useSuspenseGraphQL(query, ['stackedBookThumbnails'])

	const bookID = book?.id || ''
	const thumbnailURL = book?.thumbnail?.url

	if (!bookID) {
		return null
	}

	return (
		<StackedEffectThumbnail label="Books" uri={thumbnailURL} href={`/server/${serverID}/books`} />
	)
}
