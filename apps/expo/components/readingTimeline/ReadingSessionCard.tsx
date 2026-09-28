import { parseGraphQLPercentageDecimal } from '@stump/client'
import { FragmentType, graphql, ReadingSessionCardFragment, useFragment } from '@stump/graphql'
import { formatHumanDuration } from '@stump/i18n'
import { intlFormat } from 'date-fns'
import { useRouter } from 'expo-router'
import { Bookmark as BookmarkIcon, Highlighter, LucideIcon, PencilLine } from 'lucide-react-native'
import { Pressable, View } from 'react-native'

import { useTranslate } from '~/lib/hooks'
import { useActiveServer } from '~/providers/ActiveServerProvider'
import { usePreferencesStore } from '~/stores'

import { ThumbnailImage, ThumbnailPlaceholderData } from '../image'
import { Card, Icon, Progress, Text } from '../ui'
import { SessionProgressBar } from './SessionProgressBar'

const fragment = graphql(`
	fragment ReadingSessionCard on SessionWithEvents {
		session {
			id
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
type Bookmark = Extract<ReadingSessionCardFragment['events'][number], { __typename: 'Bookmark' }>

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
}

// a few thoughts:
// - for a book's own reading timeline, perhaps we do not need to show the thumbnail nor title etc at all
//   however with that removed there is not much more to show
export function ReadingSessionCard({ fragmentRef, mediaFragmentRef, media }: Props) {
	const router = useRouter()
	const { t } = useTranslate()
	const {
		activeServer: { id: serverId },
	} = useActiveServer()
	const { session, events } = useFragment(fragment, fragmentRef)

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

	// TODO: prefer journal entry as preview, fallback to annotation texts
	const truncatedAnnotations = events
		.filter((e): e is Annotation => e.__typename === 'MediaAnnotation' && e.annotationText != null)
		.slice(0, 3)
		.map((e) => e.annotationText)
		.join('\n')
	// ^ obv not quite right but fine for now, TODO: make the fake data notes actually something useful for mocks

	// TODO: rm mock/fake data throughout ehre and there
	return (
		<View key={session.id} className="gap-4 py-4">
			<View className="px-3 flex-row items-center justify-between">
				<Text className="text-foreground-muted font-medium">{timeRange}</Text>

				<Text className="text-foreground-muted">
					{session?.elapsedSeconds != null ? formatHumanDuration(session.elapsedSeconds) : '??'}
				</Text>
			</View>

			<Pressable
				onPress={() =>
					router.push(`/stump/${serverId}/books/${bookId}/reading-timeline/${session.id}`)
				}
			>
				<Card>
					<Card.Row>
						<View className="gap-2 flex-1">
							<View className="gap-4 flex-row">
								<ThumbnailImage
									source={{
										uri: thumbnailUrl,
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
											<Text size="sm">{`${t('common.page')} ${endPage}`}</Text>
											<Text
												size="xs"
												className="pb-0.5 text-foreground-muted"
											>{` / ${pageCount}`}</Text>
										</View>

										{/* <View className="squircle px-2.5 py-0.5 bg-black/5 dark:bg-white/10 flex-row items-end rounded-full">
											<Text size="sm">{`p. ${session.startPage}-${session.endPage}`}</Text>
										</View> */}

										{/* <View className="squircle px-2.5 py-0.5 bg-black/5 dark:bg-white/10 flex-row items-end rounded-full">
											<Text size="sm">{formatNarrowDuration(session.elapsedSeconds)}</Text>
										</View> */}
									</View>

									<View className="flex-1" />

									{/*TODO: normal progress bar? or keep window? kinda looks more awk without
									the annotations to explain the window. ill leave it for a second opinion for now*/}
									{/*<View className="w-full">
										<SessionProgressBar session={session} events={events} />
									</View>*/}

									<Progress
										className="h-3"
										value={parseGraphQLPercentageDecimal(session.endPercentage) ?? 0}
										trackClassName="bg-black/10"
										indicatorClassName="bg-white/70"
									/>
								</View>
							</View>

							<Text numberOfLines={4} className="text-lg text-foreground-muted">
								{truncatedAnnotations}
							</Text>
						</View>
					</Card.Row>

					<Card.Row>
						<View className="gap-2.5 -my-2.5 flex-row">
							{/* <Text className="font-medium text-white/70">
								{intlFormat(startDate, {
									year: 'numeric',
									month: 'short',
									day: 'numeric',
									hour: 'numeric',
									minute: 'numeric',
									weekday: 'short',
								})}
							</Text> */}

							<View className="flex-1" />

							<MarkingsStat icon={BookmarkIcon} value={bookmarksCount} />
							<MarkingsStat icon={Highlighter} value={highlightsCount} />
							<MarkingsStat icon={PencilLine} value={annotationsCount} />
						</View>

						{/*<View className="flex-1" />*/}
						{/*^ pushes things left evenly more close to mock drawing, could also just not use stat cards*/}
					</Card.Row>
				</Card>
			</Pressable>
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
			<Icon as={icon} size={12} strokeWidth={1.5} absoluteStrokeWidth className="text-white/70" />
			<Text className="font-medium text-white/70">{value}</Text>
		</View>
	)
}
