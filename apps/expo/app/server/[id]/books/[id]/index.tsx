import { useMediaByIdQuery, useSDK } from '@stump/client'
import { ActiveReadingSession } from '@stump/sdk'
import dayjs from 'dayjs'
import duration from 'dayjs/plugin/duration'
import relativeTime from 'dayjs/plugin/relativeTime'
import { Image as ExpoImage } from 'expo-image'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useEffect } from 'react'
import { View } from 'react-native'
import { ScrollView } from 'react-native-gesture-handler'
import { SafeAreaView } from 'react-native-safe-area-context'

import { useActiveServer } from '~/components/activeServer'
import { BookMetaLink } from '~/components/book'
import { BookDescription, InfoRow, InfoStat } from '~/components/book/overview'
import { FasterImage, Image } from '~/components/Image'
import RefreshControl from '~/components/RefreshControl'
import { Button, Heading, Text } from '~/components/ui'
import { formatBytes } from '~/lib/format'

dayjs.extend(relativeTime)
dayjs.extend(duration)

export default function Screen() {
	const { id: bookID } = useLocalSearchParams<{ id: string }>()
	const {
		activeServer: { id: serverID },
	} = useActiveServer()
	const { sdk } = useSDK()
	const { media, refetch, isRefetching } = useMediaByIdQuery(bookID, { suspense: true })

	const router = useRouter()

	useEffect(() => {
		if (media?.current_page) {
			ExpoImage.prefetch(sdk.media.bookPageURL(media.id, media.current_page), {
				headers: {
					Authorization: sdk.authorizationHeader || '',
				},
			})
		}
	}, [sdk, media?.current_page, media?.id])

	if (!media) return null

	const progression = media.active_reading_session
	const lastCompletion = media.finished_reading_sessions?.[0]
	const formattedSize = formatBytes(media.size)
	const description = media.metadata?.summary || ''
	const genres = media.metadata?.genre?.map((genre) => `#${genre}`).join(', ')
	const links = media.metadata?.links || []
	const pages = media.metadata?.page_count || media.pages
	const characters = media.metadata?.characters?.join(', ')

	const seriesName = media.metadata?.series
	const seriesPosition = media.metadata?.number
	const seriesVolume = media.metadata?.volume

	const noMetadata = !description && !seriesName && !genres && !characters

	const publisher = media.metadata?.publisher
	const writers = media.metadata?.writers?.join(', ')
	const colorists = media.metadata?.colorists?.join(', ')
	const inkers = media.metadata?.inkers?.join(', ')
	const letterers = media.metadata?.letterers?.join(', ')
	const coverArtists = media.metadata?.cover_artists?.join(', ')

	const noAcknowledgements =
		!publisher && !writers && !colorists && !inkers && !letterers && !coverArtists

	const renderRead = () => {
		const { page, percentage_completed, epubcfi } = progression || {}
		if (page || percentage_completed || !!epubcfi) {
			return <Text>Continue</Text>
		} else if (media.finished_reading_sessions?.length) {
			return <Text>Read again</Text>
		} else {
			return <Text>Read</Text>
		}
	}

	const renderPercentage = ({ page, percentage_completed }: ActiveReadingSession) => {
		if (!page && !percentage_completed) {
			return null
		}
		const percentageCompleted =
			percentage_completed?.toFixed(2) ?? Math.round(((page || 0) / pages) * 100)
		return <InfoStat label="Completed" value={`${percentageCompleted}%`} />
	}

	const renderReadTime = ({ elapsed_seconds, started_at }: ActiveReadingSession) => {
		if (!elapsed_seconds || !started_at) {
			return null
		}

		if (elapsed_seconds) {
			const readTime = dayjs.duration(elapsed_seconds, 'seconds').humanize()
			return <InfoStat label="Read time" value={readTime} />
		} else {
			return <InfoStat label="Started" value={dayjs(started_at).fromNow(true)} />
		}
	}

	return (
		<SafeAreaView className="flex-1 bg-background">
			<ScrollView
				className="flex-1 bg-background px-6 py-3"
				refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
			>
				<View className="flex-1 gap-8">
					<View className="flex items-center gap-4">
						<Heading size="lg" className="mt-6 leading-6">
							{media.metadata?.title || media.name}
						</Heading>
						<View className="aspect-[2/3] self-center overflow-hidden rounded-lg">
							{/* <Image
								source={{
									uri: sdk.media.thumbnailURL(media.id),
									headers: {
										Authorization: sdk.authorizationHeader,
									},
								}}
								contentFit="fill"
								style={{ height: 350, width: 'auto' }}
							/> */}
							<FasterImage
								source={{
									url: sdk.media.thumbnailURL(media.id),
									headers: {
										Authorization: sdk.authorizationHeader || '',
									},
									resizeMode: 'fill',
								}}
								style={{ height: 350, width: 'auto' }}
							/>
						</View>
					</View>

					<View className="flex w-full flex-row items-center gap-2 tablet:max-w-sm tablet:self-center">
						<Button
							className="flex-1 border border-edge"
							onPress={() =>
								router.push({
									// @ts-expect-error: It is fine, expects string literal with [id]
									pathname: `/server/${serverID}/books/${bookID}/read`,
								})
							}
						>
							{renderRead()}
						</Button>
						<Button variant="secondary" disabled>
							<Text>Download</Text>
						</Button>
					</View>

					{progression && (
						<View className="flex flex-row justify-around">
							{progression.page && <InfoStat label="Page" value={progression.page.toString()} />}
							{progression.epubcfi && (
								<InfoStat
									label="Locator"
									value={`${progression.epubcfi.slice(0, 4)}...${progression.epubcfi.slice(-4)}`}
								/>
							)}
							{renderPercentage(progression)}
							{renderReadTime(progression)}
						</View>
					)}

					{lastCompletion && !progression && (
						<View className="flex flex-row justify-around">
							<InfoStat label="Pages" value={pages.toString()} />
							{lastCompletion.completed_at && (
								<InfoStat
									label="Finished"
									value={dayjs(lastCompletion.completed_at).fromNow(false)}
								/>
							)}
						</View>
					)}

					<View className="flex w-full gap-2">
						<Text className="text-lg text-foreground-muted">Information</Text>

						<View className="flex flex-col gap-2 rounded-lg bg-background-surface p-3">
							<InfoRow label="Identifier" value={media.id} />
							<InfoRow label="Pages" value={pages.toString()} />
							<InfoRow label="Kind" value={media.extension.toUpperCase()} />
							{formattedSize && <InfoRow label="Size" value={formattedSize} />}
						</View>
					</View>

					<View className="flex w-full gap-2">
						<Text className="text-lg text-foreground-muted">Metadata</Text>

						<View className="flex flex-col gap-2 rounded-lg bg-background-surface p-3">
							{noMetadata && <InfoRow label="No metadata available" value="" />}

							{description && <BookDescription description={description} />}

							{seriesName && <InfoRow label="Series Name" value={seriesName} />}
							{seriesPosition && (
								<InfoRow
									label={seriesName ? 'Position' : 'Series Position'}
									value={seriesPosition.toString()}
								/>
							)}
							{seriesVolume && <InfoRow label="Volume" value={seriesVolume.toString()} />}

							{/* TODO: split into separate section to support click-to-search */}
							{genres && <InfoRow label="Genres" value={genres} />}
							{characters && <InfoRow label="Characters" value={characters} />}
						</View>
					</View>

					{!noAcknowledgements && (
						<View className="flex w-full gap-2">
							<Text className="text-lg text-foreground-muted">Acknowledgements</Text>

							<View className="flex flex-col gap-2 rounded-lg bg-background-surface p-3">
								{publisher && <InfoRow label="Publisher" value={publisher} />}
								{writers && <InfoRow label="Writers" value={writers} />}
								{colorists && <InfoRow label="Colorists" value={colorists} />}
								{inkers && <InfoRow label="Inkers" value={inkers} />}
								{letterers && <InfoRow label="Letterers" value={letterers} />}
								{coverArtists && <InfoRow label="Cover Artists" value={coverArtists} />}
							</View>
						</View>
					)}

					{links.length > 0 && (
						<View className="flex w-full gap-2">
							<Text className="text-lg text-foreground-muted">Links</Text>

							<View className="flex flex-row flex-wrap gap-2 p-3">
								{links.map((link) => (
									<BookMetaLink key={link} href={link} />
								))}
							</View>
						</View>
					)}
				</View>
			</ScrollView>
		</SafeAreaView>
	)
}
