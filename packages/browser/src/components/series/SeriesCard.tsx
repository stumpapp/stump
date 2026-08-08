import { useSDK } from '@stump/client'
import { Text } from '@stump/components'
import { FileStatus } from '@stump/graphql'
import { useLocaleContext } from '@stump/i18n'
import { useCallback } from 'react'

import { usePrefetchSeries } from '@/scenes/series'
import { usePrefetchSeriesBooks } from '@/scenes/series/tabs/books/SeriesBooksScene'

import paths from '../../paths'
import { EntityCard } from '../entity'

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
	const { t } = useLocaleContext()
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
				<Text size="xs" className="text-warning uppercase">
					{t('entityUi.seriesCard.seriesMissing')}
				</Text>
			)
		}

		return (
			<div className="flex items-center justify-between">
				<Text size="xs" variant="muted">
					{t('entityUi.seriesCard.booksCount', { count: Number(data.mediaCount) })}
				</Text>
			</div>
		)
	}, [isCoverOnly, data, t])

	const overrides = isCoverOnly
		? {
				className: 'shrink',
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
