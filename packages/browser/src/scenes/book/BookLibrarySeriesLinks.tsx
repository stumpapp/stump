import { useSeriesByIdQuery } from '@stump/client'
import { cx, Link, Text } from '@stump/components'
import { Series } from '@stump/types'
import React from 'react'

import paths from '../../paths'
import SeriesLibraryLink from '../series/SeriesLibraryLink'

type Props = {
	libraryId?: string
	series?: Series | null
	seriesId: string
	linkSegments?: {
		to?: string
		label: string
		noShrink?: boolean
	}[]
}

export default function BookLibrarySeriesLinks({
	libraryId,
	seriesId,
	series,
	linkSegments,
}: Props) {
	const { series: fetchedSeries } = useSeriesByIdQuery(seriesId, { enabled: !!series })

	const resolvedSeries = series || fetchedSeries
	const resolvedLibraryId = libraryId || resolvedSeries?.library_id

	const renderSeriesLink = () => {
		if (!resolvedSeries) {
			return null
		}

		return (
			<>
				<span className="mx-2 text-foreground-muted">/</span>
				<Link to={paths.seriesOverview(resolvedSeries.id)} className="line-clamp-1">
					{resolvedSeries.name}
				</Link>
			</>
		)
	}

	return (
		<div className="flex items-center text-sm md:text-base">
			{resolvedLibraryId && <SeriesLibraryLink id={resolvedLibraryId} />}
			{renderSeriesLink()}
			{linkSegments?.map((segment) => {
				const Component = segment.to ? Link : Text

				return (
					<React.Fragment key={segment.label}>
						<span className="mx-2 text-foreground-muted">/</span>
						<Component
							className={cx('line-clamp-1', { 'shrink-0': segment.noShrink })}
							{...(segment.to ? { to: segment.to } : {})}
						>
							{segment.label}
						</Component>
					</React.Fragment>
				)
			})}
		</div>
	)
}
