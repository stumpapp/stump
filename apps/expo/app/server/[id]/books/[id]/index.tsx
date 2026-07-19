import { useSDK, useSuspenseGraphQL } from '@stump/client'
import { formatBytes } from '@stump/client'
import { graphql, MediaFilterInput, MediaMetadataFilterInput, UserPermission } from '@stump/graphql'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useCallback, useState } from 'react'
import { Platform, View } from 'react-native'
import Animated from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import TImage from 'react-native-turbo-image'

import { useActiveServer, useStumpServer } from '~/components/activeServer'
import BackLink from '~/components/BackLink'
import { BookMetaLink, BooksAfterCursor } from '~/components/book'
import {
	BookActionMenu,
	CurrentProgressCard,
	DescriptionSection,
	DownloadButton,
	getPercentage,
	IdentifiersSheet,
	LastFinishedCard,
	useBookMenu,
	useOverviewAnimations,
} from '~/components/book/overview'
import { ThumbnailImage } from '~/components/image'
import { MetadataBadgeSection } from '~/components/overview'
import RefreshControl from '~/components/RefreshControl'
import { Button, Card, Heading, ListLabel, Text } from '~/components/ui'
import { formatSeriesPosition } from '~/lib/bookUtils'
import { useDownload, useTranslate } from '~/lib/hooks'
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
				metadata {
					totalIssues
				}
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

export default function Screen() {
	const { id: bookID } = useLocalSearchParams<{ id: string }>()
	const { t } = useTranslate()
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

	const stackFragment = useBookMenu(book)

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
	const characters = book.metadata?.characters || []

	const seriesName = book.metadata?.series || book.series.resolvedName
	const seriesPosition = formatSeriesPosition(
		(Number(book.metadata?.number) || book.seriesPosition) ?? null,
		book.series.metadata?.totalIssues ?? null,
		{
			t,
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
			return <Text>{t('common.continue')}</Text>
		} else if (book.readHistory?.length) {
			return <Text>{t('common.readAgain')}</Text>
		} else {
			return <Text>{t('common.read')}</Text>
		}
	}

	const chapterTitle = progression?.locator?.chapterTitle || progression?.locator?.href
	const currentPage = progression?.page ?? progression?.locator?.locations?.position
	const totalPages = book.metadata?.pageCount || book.pages
	const percentage = getPercentage({ readProgress: progression, totalPages })
	const readthroughNumber = book.readHistory.length

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
		<>
			{stackFragment}
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
				<View className="ios:pt-safe-offset-20 pt-safe ios:pb-24 pb-16 overflow-hidden">
					<Animated.View
						// -inset-24 is because when using a lot of blur, the sides get more transparent
						// so we have to "zoom in" to have a clean line at the bottom rather than a gradient
						// pb-16/24 because the rounded corners has negative margin to make them visible
						className="-inset-24 absolute opacity-70 dark:opacity-30"
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
							// android only supports up to blur={25} which doesn't look good,
							// but if we heavily downscale first, the following looks near identical to using
							// original res with blur={40} on ios, which is what I originally settled on
							resize={60}
							blur={Platform.OS === 'ios' ? 7 : 16}
						/>
					</Animated.View>

					<View className="gap-8 px-4 tablet:px-6">
						{Platform.OS === 'android' && book && (
							<View className="pt-2 flex flex-row justify-between">
								<BackLink iconClassName="mr-[unset]" />

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
							<Heading size="lg" className="leading-6 text-center">
								{book.resolvedName}
							</Heading>

							{seriesPosition != null && (
								<Text className="text-base text-foreground-muted text-center">
									{seriesPosition}
								</Text>
							)}
						</View>

						<View className="gap-x-2 tablet:max-w-sm flex w-full flex-row items-center tablet:self-center">
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

						<CurrentProgressCard
							hidden={!progression}
							showChapterTitle={isEpub}
							chapterTitle={chapterTitle}
							page={currentPage}
							totalPages={totalPages}
							percentage={percentage}
							readingTimeSeconds={progression?.elapsedSeconds}
						/>

						<LastFinishedCard
							hidden={!!progression || !lastCompletion}
							readthroughNumber={readthroughNumber}
							lastCompletedAt={lastCompletion?.completedAt}
							readingTimeSeconds={lastCompletion?.elapsedSeconds}
						/>
					</View>
				</View>

				<View className="squircle ios:rounded-[3rem] ios:-mt-[4.5rem] gap-8 px-4 py-6 tablet:px-6 -mt-[2.5rem] rounded-[2.5rem] bg-background">
					{!!description && <DescriptionSection description={description} />}

					<Card className={cn(!description && 'px-2')}>
						<Card.StatGroup>
							{!!publisher && <Card.Stat label={t('bookMetadata.publisher')} value={publisher} />}
							{!!seriesVolume && (
								<Card.Stat label={t('bookMetadata.volume')} value={seriesVolume} />
							)}
							{book.metadata?.year != null && book.metadata.year > 0 && (
								<Card.Stat label={t('bookMetadata.year')} value={book.metadata.year} />
							)}
							<Card.Stat label={t('common.pages')} value={totalPages} />
						</Card.StatGroup>
					</Card>

					<MetadataBadgeSection
						label={t('bookMetadata.genres')}
						items={genres.map((genre) => ({
							label: genre,
							onPress: () => onClickFilterField('genres', genre),
						}))}
					/>

					{!noAcknowledgements && (
						<View className="gap-6">
							<MetadataBadgeSection
								label={t('bookMetadata.writers')}
								items={writers.map((writer) => ({
									label: writer,
									onPress: () => onClickFilterField('writers', writer),
								}))}
							/>

							<MetadataBadgeSection
								label={t('bookMetadata.colorists')}
								items={colorists.map((colorist) => ({
									label: colorist,
									onPress: () => onClickFilterField('colorists', colorist),
								}))}
							/>

							<MetadataBadgeSection
								label={t('bookMetadata.inkers')}
								items={inkers.map((inker) => ({
									label: inker,
									onPress: () => onClickFilterField('inkers', inker),
								}))}
							/>

							<MetadataBadgeSection
								label={t('bookMetadata.letterers')}
								items={letterers.map((letterer) => ({
									label: letterer,
									onPress: () => onClickFilterField('letterers', letterer),
								}))}
							/>

							<MetadataBadgeSection
								label={t('bookMetadata.coverArtists')}
								items={coverArtists.map((coverArtist) => ({
									label: coverArtist,
									onPress: () => onClickFilterField('coverArtists', coverArtist),
								}))}
							/>
						</View>
					)}

					<MetadataBadgeSection
						label={t('bookMetadata.characters')}
						items={characters.map((character) => ({
							label: character,
							onPress: () => onClickFilterField('characters', character),
						}))}
					/>

					<BooksAfterCursor cursor={bookID} />

					{links.length > 0 && (
						<View className="gap-2 flex w-full">
							<ListLabel className="ios:px-4 px-2">{t('bookMetadata.links')}</ListLabel>

							<View className="ios:px-4 gap-2 px-2 flex flex-row flex-wrap">
								{links.map((link) => (
									<BookMetaLink key={link} href={link} />
								))}
							</View>
						</View>
					)}

					{showDetails && (
						<Card label={t('common.details')}>
							{book.extension && (
								<Card.Row label={t('bookMetadata.format')} value={book.extension.toUpperCase()} />
							)}
							{!!formattedSize && <Card.Row label={t('bookMetadata.size')} value={formattedSize} />}
							{book.metadata?.language && (
								<Card.Row label={t('bookMetadata.language')} value={book.metadata.language} />
							)}
							{book.metadata?.ageRating != null && book.metadata.ageRating > 0 && (
								<Card.Row
									label={t('bookMetadata.ageRating')}
									value={`${book.metadata.ageRating}+`}
								/>
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
		</>
	)
}
