import { formatBytesSeparate } from '@stump/client'
import { STAT_COLORS } from '@stump/components'
import { formatHumanDurationSeparate, useLocaleContext } from '@stump/i18n'
import { BookCheck, BookOpen, Clock, HardDrive, Layers } from 'lucide-react'

import { EntityOverviewSheet } from '@/components/sharedLayout'

import { useLibraryContext } from './context'

type Props = {
	isOpen: boolean
	onClose: () => void
}

export function LibraryOverviewSheet({ isOpen, onClose }: Props) {
	const {
		library: { name, description, stats, tags, config },
	} = useLibraryContext()
	const { t } = useLocaleContext()
	const hideSeriesView = config?.hideSeriesView ?? false
	const formattedSize = stats?.totalBytes ? formatBytesSeparate(stats.totalBytes) : null
	const formattedTime = stats?.totalReadingTimeSeconds
		? formatHumanDurationSeparate(stats.totalReadingTimeSeconds)
		: null

	const resolvedStats = stats
		? [
				...(!hideSeriesView
					? [
							{
								label: t('common.infoSheetStats.series'),
								icon: Layers,
								value: stats.seriesCount,
								colors: STAT_COLORS.series,
							},
						]
					: []),
				{
					label: t('common.infoSheetStats.inProgress'),
					icon: BookOpen,
					value: stats.inProgressBooks,
					colors: STAT_COLORS.inProgress,
				},
				{
					label: t('common.infoSheetStats.completedBooks'),
					icon: BookCheck,
					value: stats.completedBooks,
					suffix: `/ ${stats.bookCount}`,
					colors: STAT_COLORS.completed,
				},
				...(formattedTime
					? [
							{
								label: t('common.infoSheetStats.readingTime'),
								icon: Clock,
								value: formattedTime.value,
								suffix: formattedTime.unit,
								colors: STAT_COLORS.readingTime,
							},
						]
					: []),
				...(formattedSize
					? [
							{
								label: t('common.infoSheetStats.size'),
								icon: HardDrive,
								value: formattedSize.value,
								suffix: formattedSize.unit,
								colors: STAT_COLORS.size,
							},
						]
					: []),
			]
		: undefined

	// TODO: add more stuff, like SeriesOverviewSheet
	return (
		<EntityOverviewSheet
			isOpen={isOpen}
			onClose={onClose}
			name={name}
			description={description}
			stats={resolvedStats}
			tags={tags.map((tag) => tag.name)}
		/>
	)
}
