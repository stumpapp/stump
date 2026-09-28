import { parseGraphQLPercentageDecimal } from '@stump/client'
import { FragmentType, graphql, ReadingSessionCardFragment, useFragment } from '@stump/graphql'
import { formatHumanDuration } from '@stump/i18n'
import { intlFormat } from 'date-fns'
import { useRouter } from 'expo-router'
import { Bookmark as BookmarkIcon, Highlighter, PencilLine } from 'lucide-react-native'
import { useState } from 'react'
import { Easing, Pressable, View } from 'react-native'
import { easeGradient } from 'react-native-easing-gradient'

import { STAT_COLORS } from '~/lib/constants'
import { useTranslate } from '~/lib/hooks'
import { useActiveServer } from '~/providers/ActiveServerProvider'
import { usePreferencesStore } from '~/stores'

import { ThumbnailImage, ThumbnailPlaceholderData } from '../image'
import { MiniStatCard } from '../stats'
import { Card, Progress, Text } from '../ui'
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

								<View className="flex-row">
									<View className="squircle px-2.5 py-0.5 bg-black/5 dark:bg-white/10 flex-row items-end rounded-full">
										<Text size="sm">{`${t('common.page')} ${endPage}`}</Text>
										<Text
											size="xs"
											className="pb-0.5 text-foreground-muted"
										>{` / ${pageCount}`}</Text>
									</View>
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
					</Card.Row>

					{truncatedAnnotations && <AnnotationsRow preview={truncatedAnnotations} />}

					<Card.Row>
						<MiniStatCard value={bookmarksCount} colors={STAT_COLORS.size} icon={BookmarkIcon} />
						<MiniStatCard value={highlightsCount} colors={STAT_COLORS.size} icon={Highlighter} />
						<MiniStatCard value={annotationsCount} colors={STAT_COLORS.size} icon={PencilLine} />
						{/*<View className="flex-1" />*/}
						{/*^ pushes things left evenly more close to mock drawing, could also just not use stat cards*/}
					</Card.Row>
				</Card>
			</Pressable>
		</View>
	)
}

// this is basically a LongRow but without the tappable expanding, we'll see if it lives long
// here or if longrow should be more dynamic. for one use-case, i think it's fine here, only
// care about extending if actual multiple uses benefit
function AnnotationsRow({ preview }: { preview: string }) {
	// const colors = useColors()
	// const { isDarkColorScheme } = useColorScheme()
	// const accentColor = usePalette('accent')

	const gradient = easeGradient({
		colorStops: {
			// 0.4: { color: isDarkColorScheme ? '#1A1A1A00' : '#F2F2F100' },
			// 1: { color: isDarkColorScheme ? '#1A1A1A' : '#F2F2F1' },

			0.4: { color: '#2e340900' },
			1: { color: '#2e3409cc' },
			// TODO: picked from specific book but need to put color somewhere to pull throughout
		},
		easing: Easing.bezier(0.45, 0, 0.55, 1),
	})

	const [isOverLineLimit, setIsOverLineLimit] = useState(false)

	return (
		<Card.BaseRowComponent
			// onPress={() => setExpanded(!expanded)}
			className="gap-1 flex-wrap"
		>
			<View className="shrink items-end justify-center">
				<Text
					numberOfLines={4}
					className="text-lg text-foreground-muted"
					onTextLayout={(e) => setIsOverLineLimit(e.nativeEvent.lines.length >= 4)}
				>
					{preview}
				</Text>

				{/*FIXME: cannot fix the harshness box rn*/}
				{/*{isOverLineLimit && (
					<LinearGradient
						colors={gradient.colors}
						locations={gradient.locations}
						useAngle
						angle={172}
						style={{ position: 'absolute', inset: 0 }}
					/>
				)}*/}
			</View>
		</Card.BaseRowComponent>
	)
}
