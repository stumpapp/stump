import { useSuspenseGraphQL } from '@stump/client'
import { graphql } from '@stump/graphql'

import { useActiveServer } from '../activeServer'
import StackedEffectThumbnail from '../StackedEffectThumbnail'

const query = graphql(`
	query StackedLibraryThumbnails {
		libraries(pagination: { none: { unpaginated: true } }) {
			nodes {
				id
				thumbnail {
					url
				}
			}
		}
	}
`)

export default function StackedLibraryThumbnails() {
	const {
		activeServer: { id: serverID },
	} = useActiveServer()
	const {
		data: {
			libraries: {
				nodes: [library],
			},
		},
	} = useSuspenseGraphQL(query, ['stackedLibraryThumbnails'])

	const libraryID = library?.id || ''
	const thumbnailURL = library?.thumbnail.url

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
