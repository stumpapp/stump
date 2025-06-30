import { useSDK, useSuspenseGraphQL } from '@stump/client'
import { cx, Link, Text } from '@stump/components'
import { graphql } from '@stump/graphql'
import { Fragment } from 'react'

import paths from '../../paths'
import SeriesLibraryLink from '../series/SeriesLibraryLink'

const query = graphql(`
	query BookLibrarySeriesLinks($id: ID!) {
		seriesById(id: $id) {
			id
			name
			libraryId
		}
	}
`)

type Props = {
	seriesId?: string
	linkSegments?: {
		to?: string
		label: string
		noShrink?: boolean
	}[]
}

export default function BookLibrarySeriesLinks({ seriesId, linkSegments }: Props) {
	const { sdk } = useSDK()
	const {
		data: { seriesById: series },
	} = useSuspenseGraphQL(query, sdk.cacheKey('seriesLinks', [seriesId]), {
		id: seriesId || '',
	})
	const renderSeriesLink = () => {
		if (!series) {
			return null
		}

		return (
			<>
				<span className="mx-2 text-foreground-muted">/</span>
				<Link to={paths.seriesOverview(series.id)} className="line-clamp-1">
					{series.name}
				</Link>
			</>
		)
	}

	return (
		<div className="flex items-center text-sm md:text-base">
			{series?.libraryId && <SeriesLibraryLink id={series?.libraryId} />}
			{renderSeriesLink()}
			{linkSegments?.map((segment) => {
				const Component = segment.to ? Link : Text

				return (
					<Fragment key={segment.label}>
						<span className="mx-2 text-foreground-muted">/</span>
						<Component
							className={cx('line-clamp-1', { 'shrink-0': segment.noShrink })}
							{...(segment.to ? { to: segment.to } : {})}
						>
							{segment.label}
						</Component>
					</Fragment>
				)
			})}
		</div>
	)
}
