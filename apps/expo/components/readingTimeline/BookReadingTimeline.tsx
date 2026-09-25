import { FragmentType, graphql, useFragment } from '@stump/graphql'
import { formatHumanDuration } from '@stump/i18n'
import { intlFormat } from 'date-fns'
import groupBy from 'lodash/groupBy'
import { ChevronRight, Notebook } from 'lucide-react-native'
import { ScrollView, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { match } from 'ts-pattern'

import { cn } from '~/lib/utils'

import { ScreenBackgroundGradient } from '../BackgroundGradient'
import { Card, Icon, Text } from '../ui'
import { AnnotationEvent, BookmarkEvent } from './events'
import { fakeData } from './fakeData'

const fragment = graphql(`
	fragment BookReadingTimeline on Media {
		id
		thumbnail {
			metadata {
				averageColor
			}
		}
	}
`)

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
export function BookReadingTimeline({ fragmentRef }: Props) {
	const data = useFragment(fragment, fragmentRef)

	const renderEvent = (
		event: (typeof fakeData.readthroughs)[number]['sessions'][number]['events'][number],
	) =>
		match(event)
			.with({ __typename: 'MediaAnnotation' }, (e) => <AnnotationEvent event={e} />)
			.with({ __typename: 'Bookmark' }, (e) => <BookmarkEvent event={e} />)
			.otherwise(() => null)

	const renderSession = ({
		session,
		events,
	}: (typeof fakeData.readthroughs)[number]['sessions'][number]) => {
		return (
			<View key={session.id} className="p-4 gap-4">
				{/*TODO: date above makes sense in top-down?*/}
				<View className="flex-row items-center justify-between">
					<Text className="text-foreground-muted font-medium">
						Read for {formatHumanDuration(session.elapsedSeconds)}
					</Text>

					<Text className="text-foreground-muted">
						{/*{formatDistanceToNow(session.createdAt, { addSuffix: true })}*/}
						{intlFormat(session.sessionDate, {
							year: 'numeric',
							month: 'long',
							day: 'numeric',
						})}
					</Text>
				</View>

				<View className="gap-8">{events.map(renderEvent)}</View>
			</View>
		)
	}

	const renderSessionGroup = (
		date: string,
		sessions: (typeof fakeData.readthroughs)[number]['sessions'][number]['session'][],
		events: (typeof fakeData.readthroughs)[number]['sessions'][number]['events'][number][],
	) => {
		// TODO: if going card route, move row into event renderer so evnt decides which kind
		return (
			<>
				<Card
					label={intlFormat(date, {
						year: 'numeric',
						month: 'long',
						day: 'numeric',
					})}
					// TODO: prolly more, maybe a footer instead of something? mini stat cards? idk
					description={`Read for a total of ${formatHumanDuration(sessions.reduce((acc, s) => acc + s.elapsedSeconds, 0))}`}
				>
					{events.map((e) => (
						<Card.Row key={e.id}>{renderEvent(e)}</Card.Row>
					))}
				</Card>

				{/*just fucking around*/}
				{/*<Card>
					<Card.Row icon={Notebook} label="Journal Entries">
						<Icon as={ChevronRight} size={18} />
					</Card.Row>
				</Card>*/}
			</>
		)
	}

	const renderReadthrough = (readthrough: (typeof fakeData.readthroughs)[number]) => {
		const groupedSessions = groupBy(readthrough.sessions, ({ session }) => session.sessionDate)

		const mergedSessions = Object.entries(groupedSessions).map(([date, sessions]) => ({
			date,
			sessions: sessions.map(({ session }) => session),
			events: sessions.flatMap(({ events }) => events),
		}))

		return (
			<>
				{/*uncomment for no cards*/}
				{/*{readthrough.sessions.map(renderSession)}*/}

				{/*uncomment for cards + grouped by session date*/}
				<View className="px-4 gap-8">
					{mergedSessions.map(({ date, sessions, events }) =>
						renderSessionGroup(date, sessions, events),
					)}
				</View>
				<View
					className={cn('px-4 py-12 gap-1', {
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
				{/*<View className="gap-2 flex-row flex-wrap">
					<MiniStatCard
						icon={Info}
						value={readthrough.totalElapsedSeconds}
						colors={STAT_COLORS.readingTime}
					/>

					<MiniStatCard
						icon={Info}
						value={readthrough.totalElapsedSeconds}
						colors={STAT_COLORS.readingTime}
					/>

					<MiniStatCard
						icon={Info}
						value={readthrough.totalElapsedSeconds}
						colors={STAT_COLORS.readingTime}
					/>
				</View>*/}
			</>
		)
	}

	return (
		<SafeAreaView style={{ flex: 1 }} edges={['left', 'right']}>
			<ScreenBackgroundGradient item={data} />

			<ScrollView
				// refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
				contentInsetAdjustmentBehavior="automatic"
			>
				{fakeData.readthroughs.map(renderReadthrough)}
			</ScrollView>
		</SafeAreaView>
	)
}

// loose inspo for later:
// - https://mobbin.com/screens/6e3a7d35-9d0b-4be0-baa0-b7f819df6bc1?utm_source=copy_link&utm_medium=link&utm_campaign=screen_sharing
// - https://mobbin.com/screens/080aca36-cd60-4c77-ac7a-3d244a66d102?utm_source=copy_link&utm_medium=link&utm_campaign=screen_sharing
//   ^ v loose inspo, not the right modality but some aspects i like
