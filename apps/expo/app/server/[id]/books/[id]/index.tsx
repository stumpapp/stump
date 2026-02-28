import { useSDK, useSuspenseGraphQL } from '@stump/client'
import { BookByIdQuery, graphql, UserPermission } from '@stump/graphql'
import { formatHumanDuration } from '@stump/i18n'
import { formatDistanceToNow } from 'date-fns'
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router'
import { ChevronLeft } from 'lucide-react-native'
import { useCallback, useLayoutEffect, useState } from 'react'
import { Platform, Pressable, View } from 'react-native'
import Animated, {
	Extrapolation,
	interpolate,
	useAnimatedRef,
	useAnimatedStyle,
	useScrollOffset,
} from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import TImage from 'react-native-turbo-image'
import { stripHtml } from 'string-strip-html'

import { useActiveServer, useStumpServer } from '~/components/activeServer'
import { BookMetaLink } from '~/components/book'
import { BookActionMenu, DownloadButton } from '~/components/book/overview'
import { InfoRow, LongValue } from '~/components/book/overview'
import { ThumbnailImage } from '~/components/image'
import RefreshControl from '~/components/RefreshControl'
import { Button, Card, Heading, Text } from '~/components/ui'
import { Icon } from '~/components/ui/icon'
import { formatSeriesPosition } from '~/lib/bookUtils'
import { formatBytes, parseGraphQLDecimal } from '~/lib/format'
import { useDownload } from '~/lib/hooks'
import { usePreferencesStore } from '~/stores'

const query = graphql(`
	query BookById($id: ID!) {
		mediaById(id: $id) {
			id
			...BookMenu
			extension
			metadata {
				ageRating
				characters
				colorists
				coverArtists
				day
				editors
				identifierAmazon
				identifierCalibre
				identifierGoogle
				identifierIsbn
				identifierMobiAsin
				identifierUuid
				genres
				inkers
				language
				letterers
				links
				month
				notes
				number
				pageCount
				pencillers
				publisher
				series
				summary
				teams
				title
				titleSort
				volume
				writers
				year
			}
			pages
			readProgress {
				page
				percentageCompleted
				epubcfi
				locator {
					chapterTitle
					locations {
						fragments
						position
						progression
						totalProgression
						cssSelector
						partialCfi
					}
					href
					title
					type
				}
				startedAt
				elapsedSeconds
				updatedAt
			}
			readHistory {
				completedAt
				elapsedSeconds
			}
			resolvedName
			series {
				id
				resolvedName
				mediaCount
			}
			library {
				id
				name
			}
			seriesPosition
			size
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
			ebook {
				toc
			}
		}
	}
`)

type ActiveReadingSession = NonNullable<
	NonNullable<Pick<NonNullable<BookByIdQuery['mediaById']>, 'readProgress'>>['readProgress']
>

// TODO: I think we can rethink some of this information arch. I originally just kinda dumped
// all of the metadata on the page but I think we can definitely curate some of it better to be
// prettier. Like {seriesPosition} of {series.mediaCount} in {seriesName} instead of just dumping
// the series-related metadata in a list.

export default function Screen() {
	const { id: bookID } = useLocalSearchParams<{ id: string }>()
	const {
		activeServer: { id: serverID },
	} = useActiveServer()
	const { checkPermission } = useStumpServer()
	const { sdk } = useSDK()
	const {
		data: { mediaById: book },
		refetch,
	} = useSuspenseGraphQL(query, ['bookById', bookID], {
		id: bookID,
	})
	const { downloadBook } = useDownload({ serverId: serverID })

	const [isRefetching, setIsRefetching] = useState(false)

	// Note: I am not binding the refresh control to the isRefetching state from useSuspenseGraphQL because
	// I don't want background refetches to trigger the refresh control spinner
	const onRefresh = () => {
		setIsRefetching(true)
		refetch().finally(() => {
			setIsRefetching(false)
		})
	}

	const onDownloadBook = useCallback(async () => {
		if (!book) return

		return await downloadBook({
			id: book.id,
			extension: book.extension,
			libraryId: book.library.id,
			libraryName: book.library.name,
			seriesId: book.series.id,
			seriesName: book.series.resolvedName,
			metadata: book.metadata || undefined,
			bookName: book.resolvedName,
			readProgress: book.readProgress,
			thumbnailMeta: book.thumbnail.metadata || undefined,
			toc: book.ebook?.toc,
		})
	}, [downloadBook, book])

	const router = useRouter()
	const insets = useSafeAreaInsets()
	const thumbnailRatio = usePreferencesStore((state) => state.thumbnailRatio)

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
		if (book) {
			navigation.setOptions({
				headerRight: () => <BookActionMenu data={book} />,
			})
		}
	}, [navigation, book, bookID])

	const animatedScrollRef = useAnimatedRef<Animated.ScrollView>()
	const scrollOffset = useScrollOffset(animatedScrollRef)

	const parallaxStyle = useAnimatedStyle(() => {
		return {
			transform: [
				{ translateY: interpolate(scrollOffset.value, [0, 200], [0, 100], Extrapolation.EXTEND) },
			],
		}
	})

	if (!book) return null

	const { url: uri, metadata: placeholderData } = book.thumbnail

	const progression = book.readProgress || null
	const lastCompletion = book.readHistory?.at(0) || null

	const formattedSize = formatBytes(book.size)
	const description = book.metadata?.summary || ''
	const genres = book.metadata?.genres?.map((genre) => `#${genre}`).join(', ')
	const links = book.metadata?.links || []
	const pages = book.metadata?.pageCount || book.pages
	const characters = book.metadata?.characters?.join(', ')

	const seriesName = book.metadata?.series || book.series.resolvedName
	const seriesPosition = formatSeriesPosition(
		(Number(book.metadata?.number) || book.seriesPosition) ?? null,
		book.series.mediaCount,
		{
			seriesName,
		},
	)

	const seriesVolume = book.metadata?.volume

	const publisher = book.metadata?.publisher
	const writers = book.metadata?.writers?.join(', ')
	const colorists = book.metadata?.colorists?.join(', ')
	const inkers = book.metadata?.inkers?.join(', ')
	const letterers = book.metadata?.letterers?.join(', ')
	const coverArtists = book.metadata?.coverArtists?.join(', ')

	const identifierAmazon = book.metadata?.identifierAmazon
	const identifierCalibre = book.metadata?.identifierCalibre
	const identifierGoogle = book.metadata?.identifierGoogle
	const identifierIsbn = book.metadata?.identifierIsbn
	const identifierMobiAsin = book.metadata?.identifierMobiAsin
	const identifierUuid = book.metadata?.identifierUuid

	const noExternalIdentifiers =
		!identifierAmazon &&
		!identifierCalibre &&
		!identifierGoogle &&
		!identifierIsbn &&
		!identifierMobiAsin &&
		!identifierUuid

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

	const renderPercentage = ({ page, percentageCompleted, locator }: ActiveReadingSession) => {
		if (!page && !percentageCompleted && !locator) {
			return null
		}

		if (locator?.locations?.totalProgression != null && !percentageCompleted) {
			const percentage = Math.round(locator.locations.totalProgression * 100)
			return <Card.Stat label="Completed" value={`${percentage}%`} />
		}

		let percentage
		const decimal = percentageCompleted ? parseGraphQLDecimal(percentageCompleted) : null
		if (decimal) {
			percentage = (decimal * 100).toFixed(1)
		} else {
			percentage = (((page || 0) / pages) * 100).toFixed(1)
		}
		return <Card.Stat label="Completed" value={percentage} suffix={'%'} />
	}

	const renderReadTime = ({ elapsedSeconds, startedAt }: ActiveReadingSession) => {
		if (!elapsedSeconds || !startedAt) {
			return null
		}

		if (elapsedSeconds) {
			const readTime = formatHumanDuration(elapsedSeconds, { significantUnits: 1 })
			return <Card.Stat label="Read time" value={readTime} />
		} else {
			return <Card.Stat label="Started" value={formatDistanceToNow(new Date(startedAt))} />
		}
	}

	const renderEpubLocator = ({ epubcfi, locator }: ActiveReadingSession) => {
		if (!locator && !epubcfi) {
			return null
		}

		if (locator) {
			const chapterTitle = locator.chapterTitle || locator.href || 'Unknown'
			return <Card.Stat label="Chapter" value={chapterTitle} />
		} else {
			return <Card.Stat label="Locator" value={`${epubcfi?.slice(0, 4)}...${epubcfi?.slice(-4)}`} />
		}
	}

	const lastCompletionDistance =
		lastCompletion?.completedAt != null
			? formatDistanceToNow(new Date(lastCompletion.completedAt), { addSuffix: true })
			: 'Unknown'

	const lastCompletionReadTime =
		lastCompletion?.elapsedSeconds != null
			? formatHumanDuration(lastCompletion.elapsedSeconds, { significantUnits: 1 })
			: 'Unknown'

	return (
		<Animated.ScrollView
			className="flex-1 bg-background"
			ref={animatedScrollRef}
			refreshControl={
				<RefreshControl
					refreshing={isRefetching}
					onRefresh={onRefresh}
					progressViewOffset={insets.top}
				/>
			}
		>
			<View className="ios:pt-safe-offset-20 pt-safe overflow-hidden pb-8">
				<Animated.View
					// -inset-24 is because when using a lot of blur, the sides get more transparent
					// so we have to "zoom in" to have a clean line at the bottom rather than a gradient
					className="absolute -inset-24 opacity-70 dark:opacity-30"
					style={parallaxStyle}
				>
					<TImage
						source={{
							uri,
							headers: {
								...sdk.customHeaders,
								Authorization: sdk.authorizationHeader || '',
							},
						}}
						style={{ width: '100%', height: '100%' }}
						resizeMode="cover"
						fadeDuration={2000}
						{...(Platform.OS === 'ios' && { indicator: { color: 'transparent' } })}
						// android only supports up to blur={25} which doesn't look good,
						// but if we heavily downscale first, the following looks near identical to using
						// original res with blur={40} on ios, which is what I originally settled on
						resize={60}
						blur={Platform.OS === 'ios' ? 7 : 16}
					/>
				</Animated.View>

				<View className="gap-8 px-4 tablet:px-6">
					{Platform.OS === 'android' && book && (
						<View className="flex flex-row justify-between pt-2">
							<Pressable onPress={() => router.back()}>
								<Icon as={ChevronLeft} className="h-6 w-6" />
							</Pressable>

							<BookActionMenu data={book} />
						</View>
					)}

					<ThumbnailImage
						source={{
							uri,
							headers: {
								...sdk.customHeaders,
								Authorization: sdk.authorizationHeader || '',
							},
						}}
						resizeMode="stretch"
						size={{ height: 235 / thumbnailRatio, width: 235 }}
						placeholderData={placeholderData}
						borderAndShadowStyle={{ shadowRadius: 5 }}
					/>

					<View className="gap-2">
						<Heading size="lg" className="text-center leading-6">
							{book.resolvedName}
						</Heading>

						{seriesPosition != null && (
							<Text className="text-center text-base text-foreground-muted">{seriesPosition}</Text>
						)}
					</View>

					<View className="flex w-full flex-row items-center gap-x-2 tablet:max-w-sm tablet:self-center">
						<Button
							className="flex-1"
							roundness="full"
							onPress={() =>
								router.push({
									// @ts-expect-error: It's fine
									pathname: `/server/${serverID}/books/${bookID}/read`,
								})
							}
						>
							{renderRead()}
						</Button>
						{checkPermission(UserPermission.DownloadFile) && (
							<DownloadButton bookId={bookID} serverId={serverID} onDownload={onDownloadBook} />
						)}
					</View>

					{(progression || lastCompletion) && (
						<Card>
							{progression && (
								<Card.StatGroup>
									{progression.page && (
										<Card.Stat label="Page" value={progression.page} suffix={` / ${pages}`} />
									)}
									{!progression.page && renderEpubLocator(progression)}
									{renderPercentage(progression)}
									{renderReadTime(progression)}
								</Card.StatGroup>
							)}

							{lastCompletion && !progression && (
								<Card.StatGroup>
									<Card.Stat label="Pages" value={pages} />
									<Card.Stat label="Finished" value={lastCompletionDistance} />
									<Card.Stat label="Read time" value={lastCompletionReadTime} />
								</Card.StatGroup>
							)}
						</Card>
					)}
				</View>
			</View>

			<View className="gap-8 px-4 py-8 tablet:px-6">
				<Card label="Information">
					<InfoRow label="Identifier" value={book.id} />
					{book.metadata?.language && <InfoRow label="Language" value={book.metadata.language} />}
					<InfoRow label="Pages" value={pages.toString()} />
					<InfoRow label="Kind" value={book.extension.toUpperCase()} />
					{formattedSize && <InfoRow label="Size" value={formattedSize} />}
				</Card>

				{!noExternalIdentifiers && (
					<Card label="External Identifiers">
						{identifierAmazon && <InfoRow label="Amazon" value={identifierAmazon} />}
						{identifierCalibre && <InfoRow label="Calibre" value={identifierCalibre} />}
						{identifierGoogle && <InfoRow label="Google" value={identifierGoogle} />}
						{identifierIsbn && <InfoRow label="ISBN" value={identifierIsbn} />}
						{identifierMobiAsin && <InfoRow label="Mobi ASIN" value={identifierMobiAsin} />}
						{identifierUuid && <InfoRow label="UUID" value={identifierUuid} />}
					</Card>
				)}

				<Card label="Metadata" listEmptyStyle={{ message: 'No metadata available' }}>
					{description && <LongValue label="Description" value={stripHtml(description).result} />}
					{seriesName && <InfoRow label="Series" value={seriesName} />}
					{seriesPosition && (
						<InfoRow
							label={seriesName ? 'Position' : 'Series Position'}
							value={seriesPosition.toString()}
						/>
					)}
					{seriesVolume && (
						<InfoRow key="seriesVolume" label="Volume" value={seriesVolume.toString()} />
					)}
					{/* TODO: Separate into separate section, maybe merge with links? */}
					{genres && <InfoRow label="Genres" value={genres} />}
					{characters && <InfoRow label="Characters" value={characters} />}
				</Card>

				{!noAcknowledgements && (
					<Card label="Acknowledgements">
						{publisher && <InfoRow label="Publisher" value={publisher} />}
						{writers && <InfoRow label="Writers" value={writers} />}
						{colorists && <InfoRow label="Colorists" value={colorists} />}
						{inkers && <InfoRow label="Inkers" value={inkers} />}
						{letterers && <InfoRow label="Letterers" value={letterers} />}
						{coverArtists && <InfoRow label="Cover Artists" value={coverArtists} />}
					</Card>
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
		</Animated.ScrollView>
	)
}
