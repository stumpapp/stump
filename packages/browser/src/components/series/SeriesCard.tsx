import { useSDK } from '@stump/client'
import { Text } from '@stump/components'
import { FileStatus } from '@stump/graphql'
import { useCallback } from 'react'

import { usePrefetchSeries } from '@/scenes/series'
import { usePrefetchSeriesBooks } from '@/scenes/series/tabs/books/SeriesBooksScene'

import paths from '../../paths'
import pluralizeStat from '../../utils/pluralize'
import { EntityCard } from '../entity'

// TODO(graphql): Use fragment!

export interface SeriesCardData {
	id: string
	resolvedName: string
	mediaCount: number
	percentageCompleted: number
	status: FileStatus
}

export type SeriesCardProps = {
	data: SeriesCardData
	fullWidth?: boolean
	variant?: 'cover' | 'default'
}

export default function SeriesCard({ data, fullWidth, variant = 'default' }: SeriesCardProps) {
	const { sdk } = useSDK()

	const isCoverOnly = variant === 'cover'

	const prefetchSeries = usePrefetchSeries()
	const prefetchSeriesBooks = usePrefetchSeriesBooks()
	const prefetch = useCallback(
		() => Promise.all([prefetchSeries(data.id), prefetchSeriesBooks(data.id)]),
		[prefetchSeries, prefetchSeriesBooks, data.id],
	)

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
			href={paths.seriesOverview(data.id)}
			imageUrl={sdk.series.thumbnailURL(data.id)}
			progress={getProgress()}
			subtitle={getSubtitle()}
			onMouseEnter={prefetch}
			fullWidth={fullWidth}
			isCover={isCoverOnly}
			{...overrides}
		/>
	)
}
