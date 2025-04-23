import { usePrefetchSeries, useSDK } from '@stump/client'
import { Text } from '@stump/components'

import paths from '../../paths'
import pluralizeStat from '../../utils/pluralize'
import { EntityCard } from '../entity'
import { graphql } from '@stump/graphql'
import { useSuspenseFragment } from '@apollo/client'
import { useCallback } from 'react'

export const SERIES_CARD_FRAGMENT = graphql(`
	fragment SeriesCard on Series {
		id
		resolvedName
		mediaCount
		percentageCompleted
		status
	}
`)

export type SeriesCardProps = {
	// series: Series
	id: string
	fullWidth?: boolean
	variant?: 'cover' | 'default'
}

export default function SeriesCard({ id, fullWidth, variant = 'default' }: SeriesCardProps) {
	const { sdk } = useSDK()
	const { data } = useSuspenseFragment({
		fragment: SERIES_CARD_FRAGMENT,
		fragmentName: 'SeriesCard',
		from: {
			__typename: 'Series',
			id,
		},
	})

	const isCoverOnly = variant === 'cover'

	// const bookCount = Number(series.media ? series.media.length : series.media_count ?? 0)
	// const booksUnread = series.unread_media_count
	// const { prefetch } = usePrefetchSeries({ id: series.id })

	// const handleHover = () => prefetch()

	function getProgress() {
		if (isCoverOnly || data.percentageCompleted <= 0.0) {
			return undefined
		}

		return Math.max(100, data.percentageCompleted)
	}

	const getSubtitle = useCallback(() => {
		if (isCoverOnly) {
			return null
		}

		const isMissing = data.status === 'MISSING'
		if (isMissing) {
			return (
				<Text size="xs" className="uppercase text-amber-500">
					Series Missing
				</Text>
			)
		}

		return (
			<div className="flex items-center justify-between">
				<Text size="xs" variant="muted">
					{pluralizeStat('book', Number(data.mediaCount))}
				</Text>
			</div>
		)
	}, [isCoverOnly, data])

	const overrides = isCoverOnly
		? {
				className: 'flex-shrink',
				href: undefined,
				progress: undefined,
				subtitle: undefined,
				title: undefined,
			}
		: {}

	return (
		<EntityCard
			title={data.resolvedName}
			href={paths.seriesOverview(id)}
			imageUrl={sdk.series.thumbnailURL(id)}
			progress={getProgress()}
			subtitle={getSubtitle()}
			// onMouseEnter={handleHover}
			fullWidth={fullWidth}
			isCover={isCoverOnly}
			{...overrides}
		/>
	)
}
