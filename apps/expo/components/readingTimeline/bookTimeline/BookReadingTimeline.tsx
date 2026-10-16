import { useRefetch } from '@stump/client'
import { BookReadingTimelineFragment, FragmentType, graphql, useFragment } from '@stump/graphql'
import { intlFormat, parse } from 'date-fns'
import groupBy from 'lodash/groupBy'
import { Fragment } from 'react'
import { Platform, ScrollView, View } from 'react-native'

import { useTranslate } from '~/lib/hooks'
import { cn } from '~/lib/utils'

import RefreshControl from '../../RefreshControl'
import { Text } from '../../ui'
import { ReadingSessionCard } from '../ReadingSessionCard'

const fragment = graphql(`
	fragment BookReadingTimeline on Media {
		id
		readingTimeline {
			readthroughs {
				readthroughNumber
				startedAt
				finishedAt
				sessions {
					session {
						id
						sessionDate
					}
					...ReadingSessionCard
				}
			}
			totalElapsedSeconds
		}
		resolvedName
		pages
		thumbnail {
			url
			metadata {
				averageColor
				colors {
					color
					percentage
				}
				thumbhash
			}
		}
	}
`)

type Readthrough = NonNullable<
	BookReadingTimelineFragment['readingTimeline']
>['readthroughs'][number]

type SessionWithEvents = Readthrough['sessions'][number]

type Props = {
	fragmentRef: FragmentType<typeof fragment>
	refetch: () => Promise<unknown>
}

export function BookReadingTimeline({ fragmentRef, refetch }: Props) {
	const data = useFragment(fragment, fragmentRef)

	const [isRefreshing, onRefresh] = useRefetch(refetch)

	// TODO: handle no timeline
	return (
		<ScrollView
			refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />}
			contentInsetAdjustmentBehavior="automatic"
		>
			{data.readingTimeline?.readthroughs.map((rt) => (
				<ReadthroughSection
					key={`readthrough-${rt.readthroughNumber}`}
					readthrough={rt}
					media={data}
				/>
			))}
		</ScrollView>
	)
}

type ReadthroughSectionProps = {
	readthrough: Readthrough
	media: BookReadingTimelineFragment
}

function ReadthroughSection({ readthrough, media }: ReadthroughSectionProps) {
	const { translate } = useTranslate()

	const groupedSessions = groupBy(readthrough.sessions, ({ session }) => session.sessionDate)

	const mergedSessionsNoCard = Object.entries(groupedSessions).map(([date, sessions]) => ({
		date,
		sessions,
	}))

	const dateRange = translate('shared.readingTimeline.readthroughDateRange', {
		startDate: intlFormat(readthrough.startedAt, {
			year: 'numeric',
			month: 'long',
			day: 'numeric',
		}),
		endDate: readthrough.finishedAt
			? intlFormat(readthrough.finishedAt, {
					year: 'numeric',
					month: 'long',
					day: 'numeric',
				})
			: translate('shared.common.presentTime'),
	})

	return (
		<Fragment>
			<View className="px-4 gap-10">
				{mergedSessionsNoCard.map((data) => (
					<SessionDate
						key={`session-date-${data.date}-sessions-${data.sessions.map((s) => s.session.id).join('-')}`}
						{...data}
						media={media}
					/>
				))}
			</View>

			<View
				className={cn('px-4 py-10 gap-1', {
					'pb-0': readthrough.readthroughNumber === 1,
				})}
			>
				<Text className="text-foreground-muted text-sm text-center">{dateRange}</Text>

				<View
					className={cn('gap-4 w-full flex-row items-center', {
						'pb-6': readthrough.readthroughNumber === 1 && Platform.OS === 'android',
					})}
				>
					<View className="bg-black/10 dark:bg-white/10 h-px flex-1" />
					<Text className="text-foreground-muted font-medium shrink-0">
						{translate('shared.readingTimeline.startOfReadthrough', {
							readthroughNumber: readthrough.readthroughNumber,
						})}
					</Text>
					<View className="bg-black/10 dark:bg-white/10 h-px flex-1" />
				</View>
			</View>
		</Fragment>
	)
}

type SessionDateProps = {
	date: string
	sessions: SessionWithEvents[]
	media: BookReadingTimelineFragment
}

function SessionDate({ date, sessions, media }: SessionDateProps) {
	const parsed = parse(date, 'yyyy-MM-dd', new Date())
	const currentYear = new Date().getFullYear()
	const isSameYear = parsed.getFullYear() === currentYear

	// TODO: can prolly do sm like if the same week (sunday as anchor??) then just show day of week?
	return (
		<View className="gap-2">
			<Text className="text-2xl font-semibold tracking-wide">
				{intlFormat(parsed, {
					year: isSameYear ? undefined : 'numeric',
					// month: 'long',
					month: 'short',
					day: 'numeric',
				})}
			</Text>

			{sessions.map((session) => (
				<ReadingSessionCard key={session.session.id} fragmentRef={session} media={media} />
			))}
		</View>
	)
}
