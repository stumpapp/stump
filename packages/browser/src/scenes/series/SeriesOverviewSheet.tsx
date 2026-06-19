import { formatBytesSeparate, parseGraphQLDateTime, useGraphQL } from '@stump/client'
import { Badge, Link, NewCard, STAT_COLORS } from '@stump/components'
import { graphql } from '@stump/graphql'
import { formatHumanDurationSeparate, useLocaleContext } from '@stump/i18n'
import { intlFormat } from 'date-fns'
import { BookCheck, BookOpen, Clock, ExternalLink, HardDrive } from 'lucide-react'

import BadgeList from '@/components/BadgeList'
import { SimpleBookCard, useSimpleBookCardSize } from '@/components/book'
import MultiRowHorizontalCardList from '@/components/MultiRowHorizontalCardList'
import { EntityOverviewSheet } from '@/components/sharedLayout'

import { useSeriesContext } from './context'

const query = graphql(`
	query SeriesOverviewSheetExtas($id: ID!) {
		seriesById(id: $id) {
			id
			metadata {
				publisher
				year
				summary
				links
			}
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

	const metadata = data?.seriesById?.metadata
	const publisher = metadata?.publisher
	const year = metadata?.year
	const links = metadata?.links ?? []

	const showStatCard = publisher || year

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
			{links.length > 0 && (
				<div className="gap-1 flex flex-col">
					<NewCard.ListLabel>{t('metadataEditor.labels.links')}</NewCard.ListLabel>
					<BadgeList>
						{links.map((link) => {
							let label = link.replace(/^(https?:\/\/)?(www\.)?/, '')
							try {
								label = new URL(link).hostname
							} catch {
								// weird but w/e
							}
							return (
								<Link key={link} href={link} underline={false}>
									<Badge variant="default" rounded="full" className="cursor-pointer">
										<span>{label}</span>
										<ExternalLink className="ml-1 h-3 w-3 opacity-90" />
									</Badge>
								</Link>
							)
						})}
					</BadgeList>
				</div>
			)}

			{showStatCard && (
				<NewCard>
					<NewCard.StatGroup>
						{!!metadata.publisher && (
							<NewCard.Stat
								label={t('metadataEditor.labels.publisher')}
								value={metadata.publisher}
							/>
						)}
						{metadata.year != null && metadata.year > 0 && (
							<NewCard.Stat label={t('metadataEditor.labels.year')} value={metadata.year} />
						)}
					</NewCard.StatGroup>
				</NewCard>
			)}

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
					// TODO: create a new updated_at timestamp that is more user-friendly,
					// this one is literally whether the entity was updated which does not
					// account for e.g. books added "to the series"
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
