import { useSDK, useSuspenseGraphQL } from '@stump/client'
import { Badge, Link, Text } from '@stump/components'
import { graphql } from '@stump/graphql'

import paths from '../../paths'

const seriesQuery = graphql(`
	query BookLibrarySeriesLinks($id: ID!) {
		seriesById(id: $id) {
			id
			resolvedName
			library {
				id
				name
			}
		}
	}
`)

type Props = {
	seriesId?: string
}

export default function BookLibrarySeriesLinks({ seriesId }: Props) {
	const { sdk } = useSDK()
	const {
		data: { seriesById: series },
	} = useSuspenseGraphQL(seriesQuery, sdk.cacheKey('seriesLinks', [seriesId]), {
		id: seriesId || '',
	})

	const library = series?.library

	return (
		<div className="gap-1.5 flex items-center">
			{library && (
				<Link to={paths.librarySeries(library.id)} underline={false}>
					<Badge size="sm" rounded="full" className="cursor-pointer">
						{library.name}
					</Badge>
				</Link>
			)}
			{series && (
				<>
					<Text size="sm" variant="muted">
						/
					</Text>
					<Link to={paths.seriesOverview(series.id)} underline={false}>
						<Badge variant="primary" size="sm" rounded="full" className="cursor-pointer">
							{series.resolvedName}
						</Badge>
					</Link>
				</>
			)}
		</div>
	)
}
