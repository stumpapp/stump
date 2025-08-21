import { useSDK, useSuspenseGraphQL } from '@stump/client'
import { BookByIdQuery, graphql } from '@stump/graphql'
import dayjs from 'dayjs'
import duration from 'dayjs/plugin/duration'
import relativeTime from 'dayjs/plugin/relativeTime'
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router'
import { ChevronLeft } from 'lucide-react-native'
import { useLayoutEffect } from 'react'
import { Platform, View } from 'react-native'
import { ScrollView } from 'react-native-gesture-handler'
import { SafeAreaView } from 'react-native-safe-area-context'

import { useActiveServer } from '~/components/activeServer'
import { BookMetaLink } from '~/components/book'
import { BookActionMenu } from '~/components/book/overview'
import { BookDescription, InfoRow, InfoSection, InfoStat } from '~/components/book/overview'
import { FasterImage } from '~/components/Image'
import RefreshControl from '~/components/RefreshControl'
import { Button, Heading, Text } from '~/components/ui'
import { formatBytes } from '~/lib/format'

dayjs.extend(relativeTime)
dayjs.extend(duration)

const query = graphql(`
	query BookById($id: ID!) {
		mediaById(id: $id) {
			id
			extension
			isFavorite
			metadata {
				writers
				genres
				links
				pageCount
				characters
				coverArtists
				publisher
				inkers
				colorists
				letterers
				series
				summary
				number
				volume
			}
			pages
			readProgress {
				page
				percentageCompleted
				epubcfi
				startedAt
				elapsedSeconds
			}
			readHistory {
				completedAt
			}
			resolvedName
			series {
				resolvedName
			}
			size
			thumbnail {
				url
			}
		}
	}
`)

type ActiveReadingSession = NonNullable<
	NonNullable<Pick<NonNullable<BookByIdQuery['mediaById']>, 'readProgress'>>['readProgress']
>

// TODO: Figure out what to do with this header shit. It looks OK on Apple
// but couldn't get anything similar working on Android

export default function Screen() {
	const { id: bookID } = useLocalSearchParams<{ id: string }>()
	const {
		activeServer: { id: serverID },
	} = useActiveServer()
	const { sdk } = useSDK()
	const {
		data: { mediaById: book },
		isRefetching,
		refetch,
	} = useSuspenseGraphQL(query, ['bookById', bookID], {
		id: bookID,
	})

	const router = useRouter()

	// TODO: prefetch, see https://github.com/candlefinance/faster-image/issues/73
	// useEffect(() => {
	// 	if (media?.current_page) {
	// 		ExpoImage.prefetch(sdk.media.bookPageURL(media.id, media.current_page), {
	// 			headers: {
	// 				Authorization: sdk.authorizationHeader || '',
	// 			},
	// 		})
	// 	}
	// }, [sdk, media?.current_page, media?.id])

	const navigation = useNavigation()
	useLayoutEffect(() => {
		navigation.setOptions({
			headerLeft: () => <ChevronLeft onPress={() => navigation.goBack()} />,
			headerRight: () => <BookActionMenu id={bookID} isFavorite={book?.isFavorite || false} />,
			headerShown: Platform.OS === 'ios',
			headerTransparent: true,
			headerTitle: Platform.OS === 'ios' ? book?.resolvedName : '',
			headerLargeTitleStyle: {
				fontSize: 24,
				lineHeight: 32,
			},
			headerLargeTitle: true,
			headerBlurEffect: 'regular',
		})
	}, [navigation, book, bookID])

	if (!book) return null

	const progression = book.readProgress || null
	const lastCompletion = book.readHistory?.at(0) || null

	const formattedSize = formatBytes(book.size)
	const description = book.metadata?.summary || ''
	const genres = book.metadata?.genres?.map((genre) => `#${genre}`).join(', ')
	const links = book.metadata?.links || []
	const pages = book.metadata?.pageCount || book.pages
	const characters = book.metadata?.characters?.join(', ')

	const seriesName = book.metadata?.series || book.series.resolvedName
	const seriesPosition = book.metadata?.number
	const seriesVolume = book.metadata?.volume

	const noMetadata = !description && !seriesName && !genres && !characters

	const publisher = book.metadata?.publisher
	const writers = book.metadata?.writers?.join(', ')
	const colorists = book.metadata?.colorists?.join(', ')
	const inkers = book.metadata?.inkers?.join(', ')
	const letterers = book.metadata?.letterers?.join(', ')
	const coverArtists = book.metadata?.coverArtists?.join(', ')

	const noAcknowledgements =
		!publisher && !writers && !colorists && !inkers && !letterers && !coverArtists

	const renderRead = () => {
		const { page, percentageCompleted, epubcfi } = book.readProgress || {}

		if (page || percentageCompleted || !!epubcfi) {
			return <Text>Continue</Text>
		} else if (book.readHistory?.length) {
			return <Text>Read again</Text>
		} else {
			return <Text>Read</Text>
		}
	}

	const renderPercentage = ({ page, percentageCompleted }: ActiveReadingSession) => {
		if (!page && !percentageCompleted) {
			return null
		}
		const percentage = percentageCompleted?.toFixed(2) ?? Math.round(((page || 0) / pages) * 100)
		return <InfoStat label="Completed" value={`${percentage}%`} />
	}

	const renderReadTime = ({ elapsedSeconds, startedAt }: ActiveReadingSession) => {
		if (!elapsedSeconds || !startedAt) {
			return null
		}

		if (elapsedSeconds) {
			const readTime = dayjs.duration(elapsedSeconds, 'seconds').humanize()
			return <InfoStat label="Read time" value={readTime} />
		} else {
			return <InfoStat label="Started" value={dayjs(startedAt).fromNow(true)} />
		}
	}

	return (
		<SafeAreaView
			style={{ flex: 1 }}
			edges={Platform.OS === 'ios' ? ['top', 'left', 'right'] : ['left', 'right']}
		>
			<ScrollView
				className="flex-1 bg-background px-6 pb-3"
				refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
				contentInsetAdjustmentBehavior="automatic"
			>
				<View className="flex-1 gap-8">
					<View className="mt-6 flex items-center gap-4">
						{Platform.OS === 'android' && (
							<Heading size="lg" className="leading-6">
								{book.resolvedName}
							</Heading>
						)}
						<View className="aspect-[2/3] self-center overflow-hidden rounded-lg">
							<FasterImage
								source={{
									url: book.thumbnail.url,
									headers: {
										Authorization: sdk.authorizationHeader || '',
									},
									resizeMode: 'fill',
								}}
								style={{ height: 350, width: 'auto' }}
							/>
						</View>
					</View>

					<View className="flex w-full flex-row items-center gap-x-2 tablet:max-w-sm tablet:self-center">
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
							{lastCompletion.completedAt && (
								<InfoStat
									label="Finished"
									value={dayjs(lastCompletion.completedAt).fromNow(false)}
								/>
							)}
						</View>
					)}

					<InfoSection
						label="Information"
						rows={[
							<InfoRow key="identifier" label="Identifier" value={book.id} />,
							<InfoRow key="pages" label="Pages" value={pages.toString()} />,
							<InfoRow key="kind" label="Kind" value={book.extension.toUpperCase()} />,
							...(formattedSize ? [<InfoRow key="size" label="Size" value={formattedSize} />] : []),
						]}
					/>

					<InfoSection
						label="Metadata"
						rows={[
							...(noMetadata
								? [<InfoRow key="noMetadata" label="No metadata available" value="" />]
								: []),
							...(description
								? [<BookDescription key="description" description={description} />]
								: []),
							...(seriesName ? [<InfoRow key="series" label="Series" value={seriesName} />] : []),
							...(seriesPosition
								? [
										<InfoRow
											key="seriesPosition"
											label={seriesName ? 'Position' : 'Series Position'}
											value={seriesPosition.toString()}
										/>,
									]
								: []),
							...(seriesVolume
								? [<InfoRow key="seriesVolume" label="Volume" value={seriesVolume.toString()} />]
								: []),
							// TODO: Separate into separate section, maybe merge with links?
							...(genres ? [<InfoRow key="genres" label="Genres" value={genres} />] : []),
							...(characters
								? [<InfoRow key="characters" label="Characters" value={characters} />]
								: []),
						]}
					/>

					{!noAcknowledgements && (
						<InfoSection
							label="Acknowledgements"
							rows={[
								...(publisher
									? [<InfoRow key="publisher" label="Publisher" value={publisher} />]
									: []),
								...(writers ? [<InfoRow key="writers" label="Writers" value={writers} />] : []),
								...(colorists
									? [<InfoRow key="colorists" label="Colorists" value={colorists} />]
									: []),
								...(inkers ? [<InfoRow key="inkers" label="Inkers" value={inkers} />] : []),
								...(letterers
									? [<InfoRow key="letterers" label="Letterers" value={letterers} />]
									: []),
								...(coverArtists
									? [<InfoRow key="coverArtists" label="Cover Artists" value={coverArtists} />]
									: []),
							]}
						/>
					)}

					{links.length > 0 && (
						<View className="flex w-full gap-2">
							<Text className="text-lg text-foreground-muted">Links</Text>

							<View className="flex flex-row flex-wrap gap-2">
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
