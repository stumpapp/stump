import { formatBytesSeparate, parseGraphQLDateTime, useGraphQL } from '@stump/client'
import { NewCard, STAT_COLORS } from '@stump/components'
import { graphql } from '@stump/graphql'
import { formatHumanDurationSeparate, useLocaleContext } from '@stump/i18n'
import { intlFormat } from 'date-fns'
import { BookCheck, BookOpen, Clock, HardDrive } from 'lucide-react'

import { SimpleBookCard, useSimpleBookCardSize } from '@/components/book'
import MultiRowHorizontalCardList from '@/components/MultiRowHorizontalCardList'
import { EntityOverviewSheet } from '@/components/sharedLayout'

import { useSeriesContext } from './context'

const query = graphql(`
	query SeriesOverviewSheetExtas($id: ID!) {
		seriesById(id: $id) {
			id
			upNext(take: 10) {
				id
				...SimpleBookCard
			}
		}
	}
`)

type Props = {
	isOpen: boolean
	onClose: () => void
}

export function SeriesOverviewSheet({ isOpen, onClose }: Props) {
	const {
		series: { id, resolvedName, resolvedDescription, stats, tags, createdAt, updatedAt },
	} = useSeriesContext()
	const { t } = useLocaleContext()

	const { data } = useGraphQL(query, ['seriesById', id, 'infoSheet'], {
		id,
	})
	const upNext = data?.seriesById?.upNext ?? []

	const formattedSize = stats?.totalBytes ? formatBytesSeparate(stats.totalBytes) : null
	const formattedTime = stats?.totalReadingTimeSeconds
		? formatHumanDurationSeparate(stats.totalReadingTimeSeconds)
		: null
	const lastUpdatedAt = parseGraphQLDateTime(updatedAt)
	const createdAtDate = parseGraphQLDateTime(createdAt)

	const resolvedStats = stats
		? [
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

	const { cardHeight } = useSimpleBookCardSize()

	return (
		<EntityOverviewSheet
			isOpen={isOpen}
			onClose={onClose}
			name={resolvedName}
			description={resolvedDescription}
			stats={resolvedStats}
			tags={tags.map((tag) => tag.name)}
		>
			{upNext?.length && (
				<MultiRowHorizontalCardList
					title={t('common.upNext')}
					items={upNext}
					keyExtractor={(node) => node.id}
					renderItem={(node) => <SimpleBookCard book={node} />}
					cardHeight={cardHeight}
					rowCount={1}
				/>
			)}

			<NewCard label={t('common.info')}>
				<NewCard.Row
					label={t('common.lastUpdated')}
					value={
						lastUpdatedAt
							? intlFormat(lastUpdatedAt, {
									month: 'long',
									day: 'numeric',
									year: 'numeric',
								})
							: t('common.never')
					}
				/>
				<NewCard.Row
					label={t('common.created')}
					value={
						createdAtDate
							? intlFormat(createdAtDate, { month: 'long', day: 'numeric', year: 'numeric' })
							: t('common.unknown')
					}
				/>
			</NewCard>
		</EntityOverviewSheet>
	)
}
