import { useSuspenseGraphQL } from '@stump/client'
import { graphql } from '@stump/graphql'

import { useActiveServer } from '../activeServer'
import StackedEffectThumbnail from '../StackedEffectThumbnail'

const query = graphql(`
	query StackedSeriesThumbnails {
		series(pagination: { cursor: { limit: 1 } }) {
			nodes {
				id
				thumbnail {
					url
				}
			}
		}
	}
`)

export default function StackedSeriesThumbnails() {
	const {
		activeServer: { id: serverID },
	} = useActiveServer()
	const {
		data: {
			series: {
				nodes: [series],
			},
		},
	} = useSuspenseGraphQL(query, ['stackedSeriesThumbnails'])

	const seriesID = series?.id
	const thumbnailURL = series?.thumbnail?.url

	if (!seriesID) {
		return null
	}

	return (
		<StackedEffectThumbnail label="Series" uri={thumbnailURL} href={`/server/${serverID}/series`} />
	)
}
