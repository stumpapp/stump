import { useGraphQL } from '@stump/client'
import { graphql } from '@stump/graphql'
import { formatHumanDurationSeparate, formatNarrowDuration } from '@stump/i18n'
import { keepPreviousData } from '@tanstack/react-query'
import { useState } from 'react'
import { View } from 'react-native'

import { Card, Text } from '~/components/ui'
import { Picker } from '~/components/ui/picker/picker'
import { useTranslate } from '~/lib/hooks'

import { DailyActivityGrid } from './DailyActivityGrid'
import { STATS_RANGE_PRESETS, StatsRangePreset, toDateRange } from './range'
import { TimeToFinishStats } from './TimeToFinishStats'
import { WeekdayChart } from './WeekdayChart'

const query = graphql(`
	query RangedUserReadingStats($range: DateRangeInput) {
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
			...DailyActivityGrid
			...WeekdayChart
			...TimeToFinishStats
		}
	}
`)

export function RangedStats() {
	const { translate, locale } = useTranslate()

	const [preset, setPreset] = useState<StatsRangePreset>('year')

	const { data, isPlaceholderData } = useGraphQL(
		query,
		['readingStats', preset],
		{ range: toDateRange(preset) },
		{ placeholderData: keepPreviousData },
	)
	const stats = data?.myReadingStats

	if (!stats) return null

	const { totalSeconds, sessionCount, finishedCount, activeDayCount } = stats.totals

	const avgPerActiveDay = activeDayCount > 0 ? totalSeconds / activeDayCount : 0
	const avgPerSession = sessionCount > 0 ? totalSeconds / sessionCount : 0

	const durationSeparate = formatHumanDurationSeparate(totalSeconds)[0]
	// ^ don't care about the smallest units if present, but maybe for
	// smaller range presets we should? like last week? idk prob fine

	return (
		<View className="gap-4" style={{ opacity: isPlaceholderData ? 0.6 : 1 }}>
			<Card>
				{/*TODO: the spacing is off here but don't want to math rn*/}
				<Card.Row className="p-5">
					<View className="gap-1">
						<View className="flex-row">
							<Picker
								value={preset}
								onValueChange={setPreset}
								options={STATS_RANGE_PRESETS.map((value) => ({
									value,
									label: translate(`shared.readingStats.range.${value}`),
								}))}
							/>
						</View>
						<View className="gap-2 flex-row items-baseline">
							<Text className="text-5xl font-bold">{durationSeparate?.value ?? '??'}</Text>
							{durationSeparate?.unit && (
								<Text className="text-xl font-semibold text-foreground-muted">
									{durationSeparate.unit}
								</Text>
							)}
						</View>
						<Text className="text-foreground-muted">
							{translate('shared.readingStats.activeDays', {
								count: activeDayCount,
							})}
						</Text>
					</View>
				</Card.Row>
			</Card>

			<DailyActivityGrid fragmentRef={stats} />

			<Card>
				<Card.StatGroup>
					<Card.Stat label={translate('shared.readingStats.booksFinished')} value={finishedCount} />
					<Card.Stat
						label={translate('shared.readingStats.avgPerSession')}
						value={formatNarrowDuration(avgPerSession, { significantUnits: 1, locale })}
					/>
					<Card.Stat
						label={translate('shared.readingStats.avgPerActiveDay')}
						value={formatNarrowDuration(avgPerActiveDay, { significantUnits: 1, locale })}
					/>
				</Card.StatGroup>
			</Card>

			{totalSeconds > 0 && (
				<Card
					label={translate('shared.readingStats.dayOfWeek.title')}
					description={translate('shared.readingStats.dayOfWeek.description')}
				>
					<WeekdayChart fragmentRef={stats} />
				</Card>
			)}

			<TimeToFinishStats fragmentRef={stats} />
		</View>
	)
}
