import { usePrefetchSeries, useSDK } from '@stump/client'
import { EntityCard, Text } from '@stump/components'
import { Series } from '@stump/sdk'

import paths from '../../paths'
import pluralizeStat from '../../utils/pluralize'

export type SeriesCardProps = {
	series: Series
	fullWidth?: boolean
	variant?: 'cover' | 'default'
}

export default function SeriesCard({ series, fullWidth, variant = 'default' }: SeriesCardProps) {
	const { sdk } = useSDK()
	const isCoverOnly = variant === 'cover'

	const bookCount = Number(series.media ? series.media.length : series.media_count ?? 0)
	const booksUnread = series.unread_media_count

	const { prefetch } = usePrefetchSeries({ id: series.id })

	const handleHover = () => prefetch()

	function getProgress() {
		if (isCoverOnly || booksUnread == null) {
			return undefined
		}

		const percent = Math.round((1 - Number(booksUnread) / bookCount) * 100)
		if (percent > 100) {
			return 100
		}

		return percent
	}

	const getSubtitle = (series: Series) => {
		if (isCoverOnly) {
			return null
		}

		const isMissing = series.status === 'MISSING'
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
					{pluralizeStat('book', Number(bookCount))}
				</Text>
			</div>
		)
	}

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
			key={series.id}
			title={series.name}
			href={paths.seriesOverview(series.id)}
			imageUrl={sdk.series.thumbnailURL(series.id)}
			progress={getProgress()}
			subtitle={getSubtitle(series)}
			onMouseEnter={handleHover}
			fullWidth={fullWidth}
			isCover={isCoverOnly}
			{...overrides}
		/>
	)
}
