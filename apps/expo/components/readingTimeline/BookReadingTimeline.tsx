import { BookReadingTimelineFragment, FragmentType, graphql, useFragment } from '@stump/graphql'
import { intlFormat, parse } from 'date-fns'
import groupBy from 'lodash/groupBy'
import { ScrollView, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { cn } from '~/lib/utils'

import { ScreenBackgroundGradient } from '../BackgroundGradient'
import { Text } from '../ui'
import { ReadingSessionCard } from './ReadingSessionCard'

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
}

// TODO: resolve these thoughts too:
// - original request was grouped per logical date, and did a ton of backend work to sort that
//   so perhaps do that manually? don't know if i want to group via backend by session date,
//   so many unknowns this is why i just said fuck it and created a fake data set to sort
//   ui first as a sort of tdd lol uidd? regardless, as i have it a date with
//   multiple sessions would have multiple of those dates (i.e. it isn't grouped)
// - don't do all these inline render fns, just easier for now
// - create sm like ScreenColorsProvider to handle inline color themes for the gradient, e.g. for buttons, text, etc
//   can also just do mostly black/white alpha palette + a few accents based on provider or whatever idk
// - cards? not to cards? cards per logical date? none? decisions
//    - i like the visual grouping of dates but i anticipate awkwardness as soon as i add previews or chapter names or
//      things like that, a chunky row prolly doesn't look great
// - padding/gap all over the place, trying not to pad outermost edges in case there is something i need edge-to-edge but
//   need to uniform once landing on sm
// - some synthetic event for book complete? it would mean a double of "start of readthrough X" so would need to consider, maybe
//   either or? maybe ollie little pose for complete? i mean, no reason not to have poses for either ig
export function BookReadingTimeline({ fragmentRef }: Props) {
	const data = useFragment(fragment, fragmentRef)

	const renderSessionDate = (date: string, sessions: SessionWithEvents[]) => {
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
					<ReadingSessionCard key={session.session.id} fragmentRef={session} media={data} />
				))}
			</View>
		)
	}

	const renderReadthrough = (readthrough: Readthrough) => {
		const groupedSessions = groupBy(readthrough.sessions, ({ session }) => session.sessionDate)

		const mergedSessionsNoCard = Object.entries(groupedSessions).map(([date, sessions]) => ({
			date,
			sessions,
		}))

		return (
			<>
				<View className="px-4 gap-10">
					{mergedSessionsNoCard.map(({ date, sessions }) => renderSessionDate(date, sessions))}
				</View>

				<View
					className={cn('px-4 py-10 gap-1', {
						'pb-0': readthrough.readthroughNumber === 1,
					})}
				>
					<View className="gap-4 w-full flex-row items-center">
						<View className="bg-black/10 dark:bg-white/10 h-px flex-1" />
						<Text className="text-foreground-muted font-medium shrink-0">
							Start of Readthrough {readthrough.readthroughNumber}
						</Text>
						<View className="bg-black/5 h-px flex-1" />
					</View>

					{/*TODO: should probably localize? idk date range conventions*/}
					<Text className="text-foreground-muted text-sm text-center">
						{intlFormat(readthrough.startedAt, {
							year: 'numeric',
							month: 'long',
							day: 'numeric',
						})}

						{` - ${
							readthrough.finishedAt
								? intlFormat(readthrough.finishedAt, {
										year: 'numeric',
										month: 'long',
										day: 'numeric',
									})
								: 'Present'
						}`}
					</Text>
				</View>
			</>
		)
	}

	// TODO: handle no timeline
	return (
		<SafeAreaView style={{ flex: 1 }} edges={['left', 'right']}>
			<ScreenBackgroundGradient item={data} />

			<ScrollView
				// refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
				contentInsetAdjustmentBehavior="automatic"
			>
				{data.readingTimeline?.readthroughs.map(renderReadthrough)}
			</ScrollView>
		</SafeAreaView>
	)
}
