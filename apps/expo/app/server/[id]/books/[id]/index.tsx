import { useSDK, useSuspenseGraphQL } from '@stump/client'
import {
	BookByIdQuery,
	graphql,
	MediaFilterInput,
	MediaMetadataFilterInput,
	UserPermission,
} from '@stump/graphql'
import { formatHumanDuration } from '@stump/i18n'
import { formatDistanceToNow } from 'date-fns'
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router'
import { ChevronLeft } from 'lucide-react-native'
import { useCallback, useLayoutEffect, useState } from 'react'
import { Platform, Pressable, View } from 'react-native'
import Animated from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import TImage from 'react-native-turbo-image'

import { useActiveServer, useStumpServer } from '~/components/activeServer'
import { BookMetaLink, BooksAfterCursor } from '~/components/book'
import {
	BookActionMenu,
	DescriptionSection,
	DownloadButton,
	IdentifiersSheet,
	InfoRow,
	useOverviewAnimations,
} from '~/components/book/overview'
import { ThumbnailImage } from '~/components/image'
import { MetadataBadgeSection } from '~/components/overview'
import RefreshControl from '~/components/RefreshControl'
import { Button, Card, Heading, ListLabel, Text } from '~/components/ui'
import { Icon } from '~/components/ui/icon'
import { formatSeriesPosition } from '~/lib/bookUtils'
import { formatBytes, parseGraphQLDecimal } from '~/lib/format'
import { useDownload } from '~/lib/hooks'
import { cn } from '~/lib/utils'
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
				height
				width
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

	const { animatedScrollRef, parallaxStyle } = useOverviewAnimations()

	if (!book) return null

	const {
		url: uri,
		metadata: placeholderData,
		width: originalWidth,
		height: originalHeight,
	} = book.thumbnail

	const progression = book.readProgress || null
	const isEpub = !!progression?.locator
	const lastCompletion = book.readHistory?.at(0) || null

	const formattedSize = formatBytes(book.size)
	const description = book.metadata?.summary || ''
	const genres = book.metadata?.genres || []
	const links = book.metadata?.links || []
	const pages = book.metadata?.pageCount || book.pages
	const characters = book.metadata?.characters || []

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
	const writers = book.metadata?.writers || []
	const colorists = book.metadata?.colorists || []
	const inkers = book.metadata?.inkers || []
	const letterers = book.metadata?.letterers || []
	const coverArtists = book.metadata?.coverArtists || []

	const noAcknowledgements =
		!writers.length &&
		!colorists.length &&
		!inkers.length &&
		!letterers.length &&
		!coverArtists.length

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

		const fraction = percentageCompleted
			? parseGraphQLDecimal(percentageCompleted)
			: (page || 0) / pages

		const percentage = fraction != null ? Math.max(0, Math.min(100, Math.round(fraction * 100))) : 0

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

	const currentPage = progression?.page ?? progression?.locator?.locations?.position ?? '??'

	const lastCompletionDistance =
		lastCompletion?.completedAt != null
			? formatDistanceToNow(new Date(lastCompletion.completedAt), { addSuffix: true })
			: 'Unknown'

	const lastCompletionReadTime =
		lastCompletion?.elapsedSeconds != null
			? formatHumanDuration(lastCompletion.elapsedSeconds, { significantUnits: 1 })
			: 'Unknown'

	// Reminder: Whenever this page introduces a new clickable filter field, make sure to
	// add a corresponding bit in the filter header and prolly metadata overview object
	const onClickFilterField = (
		field: Exclude<keyof MediaMetadataFilterInput, '_or' | '_and' | '_not'>,
		value: string,
	) => {
		const filter = {
			metadata: {
				[field]: {
					// Note: Most of these are "arrays" stored as comma-separated string
					likeAnyOf: [value],
				},
			},
		} satisfies MediaFilterInput
		const filterString = JSON.stringify(filter)
		router.push({
			// @ts-expect-error: String path
			pathname: `/server/${serverID}/books?initialFilters=${filterString}`,
		})
	}

	const showDetails =
		formattedSize ||
		book.extension ||
		book.metadata?.language ||
		(book.metadata?.ageRating && book.metadata.ageRating > 0)

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
			<View className="ios:pt-safe-offset-20 pt-safe ios:pb-24 overflow-hidden pb-16">
				<Animated.View
					// -inset-24 is because when using a lot of blur, the sides get more transparent
					// so we have to "zoom in" to have a clean line at the bottom rather than a gradient
					// pb-16/24 because the rounded corners has negative margin to make them visible
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
						size={{ height: 235 / thumbnailRatio, width: 235 }}
						placeholderData={placeholderData}
						borderAndShadowStyle={{ shadowRadius: 5 }}
						originalDimensions={
							originalWidth && originalHeight
								? { width: originalWidth, height: originalHeight }
								: null
						}
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
									// @ts-expect-error: String path
									pathname: `/server/${serverID}/books/${bookID}/read`,
								})
							}
							variant="brand"
						>
							{renderRead()}
						</Button>
						{checkPermission(UserPermission.DownloadFile) && (
							<DownloadButton bookId={bookID} serverId={serverID} onDownload={onDownloadBook} />
						)}
					</View>

					{(progression || lastCompletion) && (
						<Card>
							{progression ? (
								<>
									{isEpub && <Card.StatGroup>{renderEpubLocator(progression)}</Card.StatGroup>}
									<Card.StatGroup>
										<Card.Stat label="Page" value={currentPage} suffix={` / ${pages}`} />
										{renderPercentage(progression)}
										{renderReadTime(progression)}
									</Card.StatGroup>
								</>
							) : (
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

			<View className="squircle ios:rounded-[3rem] ios:-mt-[4.5rem] -mt-[2.5rem] gap-8 rounded-[2.5rem] bg-background px-4 py-6 tablet:px-6">
				{!!description && <DescriptionSection description={description} />}

				<Card className={cn(!description && 'px-2')}>
					<Card.StatGroup>
						{!!publisher && <Card.Stat label="Publisher" value={publisher} />}
						{!!seriesVolume && <Card.Stat label="Volume" value={seriesVolume} />}
						{book.metadata?.year != null && book.metadata.year > 0 && (
							<Card.Stat label="Year" value={book.metadata.year} />
						)}
						<Card.Stat label="Pages" value={pages} />
					</Card.StatGroup>
				</Card>

				<MetadataBadgeSection
					label="Genres"
					items={genres.map((genre) => ({
						label: genre,
						onPress: () => onClickFilterField('genres', genre),
					}))}
				/>

				{!noAcknowledgements && (
					<View className="gap-6">
						<MetadataBadgeSection
							label="Writers"
							items={writers.map((writer) => ({
								label: writer,
								onPress: () => onClickFilterField('writers', writer),
							}))}
						/>

						<MetadataBadgeSection
							label="Colorists"
							items={colorists.map((colorist) => ({
								label: colorist,
								onPress: () => onClickFilterField('colorists', colorist),
							}))}
						/>

						<MetadataBadgeSection
							label="Inkers"
							items={inkers.map((inker) => ({
								label: inker,
								onPress: () => onClickFilterField('inkers', inker),
							}))}
						/>

						<MetadataBadgeSection
							label="Letterers"
							items={letterers.map((letterer) => ({
								label: letterer,
								onPress: () => onClickFilterField('letterers', letterer),
							}))}
						/>

						<MetadataBadgeSection
							label="Cover Artists"
							items={coverArtists.map((coverArtist) => ({
								label: coverArtist,
								onPress: () => onClickFilterField('coverArtists', coverArtist),
							}))}
						/>
					</View>
				)}

				<MetadataBadgeSection
					label="Characters"
					items={characters.map((character) => ({
						label: character,
						onPress: () => onClickFilterField('characters', character),
					}))}
				/>

				<BooksAfterCursor cursor={bookID} />

				{links.length > 0 && (
					<View className="flex w-full gap-2">
						<ListLabel className="ios:px-4 px-2">Links</ListLabel>

						<View className="ios:px-4 flex flex-row flex-wrap gap-2 px-2">
							{links.map((link) => (
								<BookMetaLink key={link} href={link} />
							))}
						</View>
					</View>
				)}

				{showDetails && (
					<Card label="Details">
						{book.extension && <InfoRow label="Format" value={book.extension.toUpperCase()} />}
						{!!formattedSize && <InfoRow label="Size" value={formattedSize} />}
						{book.metadata?.language && <InfoRow label="Language" value={book.metadata.language} />}
						{book.metadata?.ageRating != null && book.metadata.ageRating > 0 && (
							<InfoRow label="Age Rating" value={`${book.metadata.ageRating}+`} />
						)}
					</Card>
				)}

				<IdentifiersSheet
					identifiers={{
						stumpId: book.id,
						amazon: book.metadata?.identifierAmazon,
						calibre: book.metadata?.identifierCalibre,
						google: book.metadata?.identifierGoogle,
						isbn: book.metadata?.identifierIsbn,
						mobiAsin: book.metadata?.identifierMobiAsin,
						uuid: book.metadata?.identifierUuid,
					}}
				/>
			</View>
		</Animated.ScrollView>
	)
}
