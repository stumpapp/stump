import { TrueSheet } from '@lodev09/react-native-true-sheet'
import { parseGraphQLPercentageDecimal, useSDK } from '@stump/client'
import { FragmentType, graphql, ReadingSessionCardFragment, useFragment } from '@stump/graphql'
import { formatHumanDuration } from '@stump/i18n'
import { intlFormat } from 'date-fns'
import { usePathname, useRouter } from 'expo-router'
import {
	Bookmark as BookmarkIcon,
	CalendarClock,
	CalendarPlus,
	Highlighter,
	LucideIcon,
	PencilLine,
	Trash,
} from 'lucide-react-native'
import { useRef } from 'react'
import { View } from 'react-native'

import { useDisplay, useTranslate } from '~/lib/hooks'
import { useActiveServer } from '~/providers/ActiveServerProvider'
import { usePreferencesStore } from '~/stores'
import { useReadingTimelineDisplayStore } from '~/stores/readingTimeline'

import { ThumbnailImage, ThumbnailPlaceholderData } from '../image'
import { Card, Icon, Progress, Text } from '../ui'
import { ContextMenu } from '../ui/context-menu/context-menu'
import { SessionWithEventsTimeline } from './events'
import { ReadingSessionEditSheet } from './ReadingSessionEditSheet'
import { useReadingSessionMutations } from './useReadingSessionMutations'

const fragment = graphql(`
	fragment ReadingSessionCard on SessionWithEvents {
		session {
			id
			status
			createdAt
			updatedAt
			startPage
			endPage
			endLocator {
				locations {
					position
				}
			}
			endPercentage
			elapsedSeconds
			mediaId
			journalEntry {
				content
			}
			isLatest
		}
		events {
			__typename
			... on Bookmark {
				id
			}
			... on MediaAnnotation {
				id
				annotationText
			}
		}
		...SessionWithEventsTimeline
	}
`)

const mediaFragment = graphql(`
	fragment ReadingSessionCardMedia on SessionWithEvents {
		session {
			media {
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
		}
	}
`)

type BaseFragmentRef = FragmentType<typeof fragment>
type MediaFragmentRef = FragmentType<typeof mediaFragment>

type Annotation = Extract<
	ReadingSessionCardFragment['events'][number],
	{ __typename: 'MediaAnnotation' }
>

// the idea here is that a book's timeline will have its own info and not need to fetch
// via the media resolver on session, but in a timeline not tied to a specific book
// it would have to fetch the info as part of that node
type Props = {
	fragmentRef: BaseFragmentRef
	mediaFragmentRef?: MediaFragmentRef
	media?: {
		resolvedName: string
		pages: number
		thumbnail: {
			url: string
			metadata?: ThumbnailPlaceholderData | null
		}
	}
	// refers to the list which renders this card
	groupedBy?: 'day' | 'month'
}

export function ReadingSessionCard({
	fragmentRef,
	mediaFragmentRef,
	media,
	groupedBy = 'day',
}: Props) {
	const router = useRouter()
	const { sdk } = useSDK()
	const { translate } = useTranslate()
	const {
		activeServer: { id: serverId },
	} = useActiveServer()
	const { isTablet } = useDisplay()
	const data = useFragment(fragment, fragmentRef)
	const { session, events } = data
	const { confirmDeleteSession, confirmExtendSession } = useReadingSessionMutations()

	const feedType = useReadingTimelineDisplayStore((state) => state.feedType)
	const truncateAfter = isTablet ? 300 : 200
	const pathname = usePathname()
	const pushReferrer = pathname.includes('/books/') ? undefined : 'my-timeline'
	// ^ informs the detail screen whether to show a link to book in menu

	const editSheetRef = useRef<TrueSheet>(null)
	const gqlMedia = useFragment(mediaFragment, mediaFragmentRef)
	const thumbnailRatio = usePreferencesStore((state) => state.thumbnailRatio)
	const thumbnailUrl = media?.thumbnail?.url || gqlMedia?.session?.media?.thumbnail?.url || ''
	const thumbnailData =
		media?.thumbnail?.metadata || gqlMedia?.session?.media?.thumbnail?.metadata || null

	const bookId = session.mediaId
	const pageCount = media?.pages || gqlMedia?.session?.media?.pages || '??'
	const bookName = media?.resolvedName || gqlMedia?.session?.media?.resolvedName || '??'

	const startDate = new Date(session.createdAt)
	const endDate = new Date(session.updatedAt)
	const endPage = session.endPage ?? session.endLocator?.locations?.position ?? '??'

	const timeRange = `${intlFormat(startDate, {
		hour: 'numeric',
		minute: 'numeric',
	})} - ${intlFormat(endDate, {
		hour: 'numeric',
		minute: 'numeric',
	})}`

	const bookmarksCount = events.filter((e) => e.__typename === 'Bookmark').length
	const highlightsCount = events.filter(
		(e) => e.__typename === 'MediaAnnotation' && e.annotationText == null,
	).length
	const annotationsCount = events.filter(
		(e) => e.__typename === 'MediaAnnotation' && e.annotationText != null,
	).length

	// TODO(reading-journal): support some flavor of rich text / markdown eventually
	const annotationTexts = events
		.filter((e): e is Annotation => e.__typename === 'MediaAnnotation' && e.annotationText != null)
		.map((e) => e.annotationText)
		.join('\n')
	const textSource = session.journalEntry?.content ?? annotationTexts
	const previewText =
		textSource.length > truncateAfter
			? translate('shared.common.truncatedText', {
					text: textSource.slice(0, truncateAfter).trimEnd(),
					// ^ trim otherwise there could be a space before the ellipsis
				})
			: textSource

	const renderContent = () => {
		if (feedType === 'sessions') {
			return (
				<Card>
					<Card.Row>
						<View className="gap-2 flex-1">
							<View className="gap-4 flex-row">
								<ThumbnailImage
									source={{
										uri: thumbnailUrl,
										headers: {
											...sdk.customHeaders,
											Authorization: sdk.authorizationHeader || '',
										},
									}}
									size={{ height: 80 / thumbnailRatio, width: 80 }}
									placeholderData={thumbnailData}
									borderAndShadowStyle={{ shadowRadius: 5 }}
								/>

								<View className="gap-3 flex-1">
									<Text className="text-lg font-semibold shrink" numberOfLines={2}>
										{bookName}
									</Text>

									<View className="gap-1.5 flex-row">
										<View className="squircle px-2.5 py-0.5 bg-black/5 dark:bg-white/10 flex-row items-end rounded-full">
											<Text size="sm">{`${translate('shared.common.page')} ${endPage}`}</Text>
											<Text
												size="xs"
												className="pb-0.5 text-foreground-muted"
											>{` / ${pageCount}`}</Text>
										</View>

										{/* <View className="squircle px-2.5 py-0.5 bg-black/5 dark:bg-white/10 flex-row items-end rounded-full">
											<Text size="sm">{`pp. ${session.startPage}-${session.endPage}`}</Text>
										</View> */}

										{/* <View className="squircle px-2.5 py-0.5 bg-black/5 dark:bg-white/10 flex-row items-end rounded-full">
											<Text size="sm">{formatNarrowDuration(session.elapsedSeconds)}</Text>
										</View> */}
									</View>

									<View className="flex-1" />

									{/*TODO(reading-timeline): normal progress vs windowed one, revisit when deciding text above*/}
									{/*<View className="w-full">
										<SessionProgressBar session={session} events={events} />
									</View>*/}

									<Progress
										className="h-3 mb-1"
										value={parseGraphQLPercentageDecimal(session.endPercentage) ?? 0}
										trackClassName="bg-black/20 dark:bg-white/10"
										indicatorClassName="bg-black/10 dark:bg-white/60"
									/>
								</View>
							</View>

							{previewText && (
								<Text numberOfLines={4} className="text-lg text-foreground-muted">
									{previewText}
								</Text>
							)}

							<View className="-mb-1 w-full flex-row items-center">
								{groupedBy === 'month' && (
									<Text className="font-medium text-foreground-muted dark:text-white/70">
										{intlFormat(startDate, {
											year: 'numeric',
											month: 'short',
											day: 'numeric',
											hour: 'numeric',
											minute: 'numeric',
											weekday: 'short',
										})}
									</Text>
								)}

								<View className="flex-1" />

								<View className="squircle px-2.5 py-0.5 bg-black/5 dark:bg-white/10 gap-2.5 flex-row rounded-full">
									<MarkingsStat icon={BookmarkIcon} value={bookmarksCount} />
									<MarkingsStat icon={Highlighter} value={highlightsCount} />
									<MarkingsStat icon={PencilLine} value={annotationsCount} />
								</View>
							</View>
						</View>
					</Card.Row>
				</Card>
			)
		} else {
			const description =
				groupedBy === 'month'
					? `${intlFormat(startDate, {
							hour: 'numeric',
							minute: 'numeric',
							month: 'short',
							day: 'numeric',
						})} - ${intlFormat(endDate, {
							hour: 'numeric',
							minute: 'numeric',
						})}`
					: timeRange

			return (
				<Card
					label={bookName}
					className="relative !overflow-visible"
					backgroundClassName="!overflow-visible"
					description={description}
				>
					<View className="-top-8 -right-2 absolute z-10">
						<ThumbnailImage
							source={{
								uri: thumbnailUrl,
								headers: {
									...sdk.customHeaders,
									Authorization: sdk.authorizationHeader || '',
								},
							}}
							size={{ height: 75 / thumbnailRatio, width: 75 }}
							placeholderData={thumbnailData}
							borderAndShadowStyle={{ shadowRadius: 5 }}
						/>
					</View>
					<SessionWithEventsTimeline fragmentRef={data} />
				</Card>
			)
		}
	}

	const onNavigateToSessionDetail = () =>
		router.push(
			`/stump/${serverId}/books/${bookId}/reading-timeline/${session.id}${pushReferrer ? `?from=${pushReferrer}` : ''}`,
		)
	const onPress = feedType === 'sessions' ? onNavigateToSessionDetail : undefined
	// ^ this dance is because the events have taps (e.g., open annotation sheet) and
	// it interferes with the context menu and i rather not deal with that mess now
	// so felt easier to just rm the onPress for the menu and give a dedicated
	// action to go to session detail, instead. i think it's largely fine, if
	// someone wants to see an event-focused view they prob won't care as much about
	// the session view.

	return (
		<View key={session.id} className="gap-4 py-4">
			{feedType === 'sessions' && (
				<View className="px-3 flex-row items-center justify-between">
					<Text className="text-foreground-muted font-medium">{timeRange}</Text>

					<Text className="text-foreground-muted">
						{session?.elapsedSeconds != null ? formatHumanDuration(session.elapsedSeconds) : '??'}
					</Text>
				</View>
			)}

			<ContextMenu
				onPress={onPress}
				groups={[
					...(feedType === 'events'
						? [
								{
									items: [
										{
											label: translate('shared.readingTimeline.goToSession'),
											icon: {
												ios: 'arrow.up.right',
												android: CalendarClock,
											},
											onPress: onNavigateToSessionDetail,
										} as const,
									],
								},
							]
						: []),
					{
						items: [
							{
								label: translate('shared.common.time.dateAndTime'),
								icon: {
									ios: 'calendar',
									android: CalendarClock,
								},
								onPress: () => editSheetRef.current?.present(),
							},
							// Note: it would prob be better to do a combo check of isLatest +
							// isNotActive or sm but that is way more work to do. i think this
							// is an appropriate balance, but also it isn't invalid to extend
							// an active session in this manner
							...(data.session.isLatest
								? [
										{
											label: translate('shared.readingTimeline.extendSession.label'),
											icon: {
												ios: 'calendar.badge.plus',
												android: CalendarPlus,
											},
											onPress: () => confirmExtendSession(data.session),
										} as const,
									]
								: []),
						],
					},
					{
						items: [
							{
								label: translate('shared.readingTimeline.deleteSession.label'),
								icon: {
									ios: 'trash',
									android: Trash,
								},
								onPress: () => confirmDeleteSession(session),
								role: 'destructive',
							},
						],
					},
				]}
			>
				{renderContent()}
			</ContextMenu>

			<ReadingSessionEditSheet ref={editSheetRef} session={session} />
		</View>
	)
}

type MarkingsStatProps = {
	icon: LucideIcon
	value: number
}

function MarkingsStat({ icon, value }: MarkingsStatProps) {
	return (
		<View className="gap-0.5 flex-row items-center">
			<Icon
				as={icon}
				size={12}
				strokeWidth={1.5}
				absoluteStrokeWidth
				className="text-foreground-muted dark:text-white/70"
			/>
			<Text className="font-medium text-foreground-muted dark:text-white/70">{value}</Text>
		</View>
	)
}
