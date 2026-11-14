import { useGraphQL } from '@stump/client'
import { NewCard, ProgressSpinner, Select, Text } from '@stump/components'
import { graphql, ReadingStatsRangedQuery } from '@stump/graphql'
import { formatHumanDurationSeparate, formatNarrowDuration } from '@stump/i18n'
import { keepPreviousData } from '@tanstack/react-query'
import { useState } from 'react'

import { ErrorState } from '@/components/ErrorState'
import { OwlEmptyState } from '@/components/Owl'
import { useTranslate } from '@/hooks/useTranslate'

import DailyActivityGrid from './DailyActivityGrid'
import { STATS_RANGE_PRESETS, StatsRangePreset, toDateRange } from './range'
import TimeToFinishStats from './TimeToFinishStats'
import WeekdayChart from './WeekdayChart'

const query = graphql(`
	query ReadingStatsRanged($range: DateRangeInput) {
		myReadingStats(range: $range) {
			range {
				start
				end
			}
			totals {
				totalSeconds
				sessionCount
				finishedCount
				activeDayCount
			}
			...ReadingStatsDailyActivity
			...ReadingStatsWeekday
			...ReadingStatsTimeToFinish
		}
	}
`)

/**
 * Only used when a bounded range has no reading, to tell apart a user without
 * any reading history from a user who just didn't read within the range
 */
const hasReadingHistoryQuery = graphql(`
	query ReadingStatsHasReadingHistory {
		myReadingStats(range: {}) {
			totals {
				sessionCount
			}
		}
	}
`)

export default function RangedStats() {
	const { translate } = useTranslate()

	const [preset, setPreset] = useState<StatsRangePreset>('year')

	return (
		<div className="gap-4 flex flex-1 flex-col">
			<div className="max-w-4xl">
				<Select value={preset} onValueChange={(value) => setPreset(value as StatsRangePreset)}>
					<Select.Trigger size="sm" aria-label={translate('shared.readingStats.rangeLabel')}>
						<Select.Value />
					</Select.Trigger>
					<Select.Content>
						{STATS_RANGE_PRESETS.map((value) => (
							<Select.Item key={value} value={value}>
								{translate(`shared.readingStats.range.${value}`)}
							</Select.Item>
						))}
					</Select.Content>
				</Select>
			</div>

			<RangedStatsBody preset={preset} />
		</div>
	)
}

type RangedStatsBodyProps = {
	preset: StatsRangePreset
}

function RangedStatsBody({ preset }: RangedStatsBodyProps) {
	const { translate } = useTranslate()

	const { data, error, isPlaceholderData, isLoading, refetch } = useGraphQL(
		query,
		['readingStatsRanged', preset],
		{ range: toDateRange(preset) },
		{ placeholderData: keepPreviousData },
	)
	const stats = data?.myReadingStats

	if (isLoading) {
		return (
			<div className="py-12 max-w-4xl flex justify-center">
				<ProgressSpinner />
			</div>
		)
	}

	if (!stats) {
		return (
			<ErrorState
				title={translate('shared.readingStats.loadError')}
				error={error}
				onRetry={() => refetch()}
			/>
		)
	}

	if (stats.totals.sessionCount === 0) {
		return <NoReadingActivity preset={preset} />
	}

	return <RangedStatsContent stats={stats} isPlaceholderData={isPlaceholderData} />
}

function NoReadingActivity({ preset }: RangedStatsBodyProps) {
	const { translate } = useTranslate()

	// an empty lifetime range already means there isn't any reading history
	const isLifetime = preset === 'lifetime'
	const { data } = useGraphQL(
		hasReadingHistoryQuery,
		['readingStatsHasReadingHistory'],
		undefined,
		{
			enabled: !isLifetime,
		},
	)
	const hasReadingHistory = !isLifetime && !!data?.myReadingStats.totals.sessionCount

	return (
		<OwlEmptyState
			title={translate('shared.readingStats.emptyState.title')}
			description={translate(
				hasReadingHistory
					? 'shared.readingStats.emptyState.descriptionNoActivityInRange'
					: 'shared.readingStats.emptyState.descriptionNoReadingHistory',
			)}
		/>
	)
}

type RangedStatsContentProps = {
	stats: ReadingStatsRangedQuery['myReadingStats']
	isPlaceholderData: boolean
}

function RangedStatsContent({ stats, isPlaceholderData }: RangedStatsContentProps) {
	const { translate, locale } = useTranslate()

	const { totalSeconds, sessionCount, finishedCount, activeDayCount } = stats.totals

	const avgPerActiveDay = activeDayCount > 0 ? totalSeconds / activeDayCount : 0
	const avgPerSession = sessionCount > 0 ? totalSeconds / sessionCount : 0

	const durationSeparate = formatHumanDurationSeparate(totalSeconds)[0]
	// ^ like the mobile app, the smallest units aren't really relevant here

	return (
		<div
			className="gap-4 max-w-4xl flex flex-col transition-opacity"
			style={{ opacity: isPlaceholderData ? 0.6 : 1 }}
			data-testid="ranged-reading-stats"
		>
			<NewCard>
				<div className="gap-1 p-5 flex flex-col">
					<div className="gap-2 flex items-baseline">
						<Text className="text-5xl font-bold">{durationSeparate?.value ?? '0'}</Text>
						{durationSeparate?.unit && (
							<Text size="xl" variant="muted" className="font-semibold">
								{durationSeparate.unit}
							</Text>
						)}
					</div>
					<Text variant="muted">
						{translate('shared.readingStats.activeDays', { count: activeDayCount })}
					</Text>
				</div>
			</NewCard>

			<DailyActivityGrid fragmentRef={stats} />

			<NewCard>
				<NewCard.StatGroup>
					<NewCard.Stat
						label={translate('shared.readingStats.booksFinished')}
						value={finishedCount}
					/>
					<NewCard.Stat
						label={translate('shared.readingStats.avgPerSession')}
						value={formatNarrowDuration(avgPerSession, { significantUnits: 1, locale })}
					/>
					<NewCard.Stat
						label={translate('shared.readingStats.avgPerActiveDay')}
						value={formatNarrowDuration(avgPerActiveDay, { significantUnits: 1, locale })}
					/>
				</NewCard.StatGroup>
			</NewCard>

			<div className="gap-4 lg:grid-cols-2 grid grid-cols-1 items-start">
				{totalSeconds > 0 && (
					<NewCard
						label={translate('shared.readingStats.dayOfWeek.title')}
						description={translate('shared.readingStats.dayOfWeek.description')}
					>
						<WeekdayChart fragmentRef={stats} />
					</NewCard>
				)}

				<TimeToFinishStats fragmentRef={stats} />
			</div>
		</div>
	)
}
