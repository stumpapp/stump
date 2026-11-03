import { useGraphQL } from '@stump/client'
import { Button, NativeSelect, NewCard, ProgressSpinner, Text } from '@stump/components'
import { graphql } from '@stump/graphql'
import { formatHumanDurationSeparate, formatNarrowDuration } from '@stump/i18n'
import { keepPreviousData } from '@tanstack/react-query'
import { useState } from 'react'

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

export default function RangedStats() {
	const { t, translate, locale } = useTranslate()

	const [preset, setPreset] = useState<StatsRangePreset>('year')

	const { data, isPlaceholderData, isLoading, isError, refetch } = useGraphQL(
		query,
		['readingStatsRanged', preset],
		{ range: toDateRange(preset) },
		{ placeholderData: keepPreviousData },
	)
	const stats = data?.myReadingStats

	const picker = (
		<NativeSelect
			size="sm"
			className="w-auto"
			aria-label={t('readingStatsScene.rangeLabel')}
			value={preset}
			onChange={(e) => setPreset(e.target.value as StatsRangePreset)}
			options={STATS_RANGE_PRESETS.map((value) => ({
				value,
				label: translate(`shared.readingStats.range.${value}`),
			}))}
		/>
	)

	if (isLoading) {
		return (
			<div className="py-12 flex justify-center">
				<ProgressSpinner />
			</div>
		)
	}

	if (isError || !stats) {
		return (
			<NewCard>
				<div className="gap-3 p-4 flex flex-col items-start">
					<Text variant="muted">{t('readingStatsScene.error')}</Text>
					<Button size="sm" variant="outline" onClick={() => refetch()}>
						{translate('shared.common.tryAgain')}
					</Button>
				</div>
			</NewCard>
		)
	}

	const { totalSeconds, sessionCount, finishedCount, activeDayCount } = stats.totals

	const avgPerActiveDay = activeDayCount > 0 ? totalSeconds / activeDayCount : 0
	const avgPerSession = sessionCount > 0 ? totalSeconds / sessionCount : 0

	const durationSeparate = formatHumanDurationSeparate(totalSeconds)[0]
	// ^ like the mobile app, the smallest units aren't really relevant here

	return (
		<div
			className="gap-4 flex flex-col transition-opacity"
			style={{ opacity: isPlaceholderData ? 0.6 : 1 }}
			data-testid="ranged-reading-stats"
		>
			<NewCard>
				<div className="gap-1 p-5 flex flex-col">
					<div>{picker}</div>
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

			{sessionCount === 0 ? (
				<OwlEmptyState
					title={t('readingStatsScene.emptyState.title')}
					description={t('readingStatsScene.emptyState.description')}
				/>
			) : (
				<>
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
				</>
			)}
		</div>
	)
}
