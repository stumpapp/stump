import { useSDK, useSuspenseGraphQL } from '@stump/client'
import { BookByIdQuery, graphql, UserPermission } from '@stump/graphql'
import dayjs from 'dayjs'
import duration from 'dayjs/plugin/duration'
import relativeTime from 'dayjs/plugin/relativeTime'
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router'
import { ChevronLeft, Loader2 } from 'lucide-react-native'
import { useCallback, useLayoutEffect, useState } from 'react'
import { Platform, Pressable, View } from 'react-native'
import { ScrollView } from 'react-native-gesture-handler'
import { SafeAreaView } from 'react-native-safe-area-context'
import { stripHtml } from 'string-strip-html'

import { useActiveServer, useStumpServer } from '~/components/activeServer'
import { BookMetaLink } from '~/components/book'
import { BookActionMenu } from '~/components/book/overview'
import { InfoRow, InfoStat } from '~/components/book/overview'
import LongValue from '~/components/book/overview/longValue/LongValue'
import { ThumbnailImage } from '~/components/image'
import RefreshControl from '~/components/RefreshControl'
import { Button, CardList, Heading, Text } from '~/components/ui'
import { Icon } from '~/components/ui/icon'
import { formatBytes, parseGraphQLDecimal } from '~/lib/format'
import { useDownload, useIsBookDownloaded } from '~/lib/hooks'
import { cn } from '~/lib/utils'
import { usePreferencesStore } from '~/stores'

dayjs.extend(relativeTime)
dayjs.extend(duration)

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
	const { downloadBook, isDownloading } = useDownload({ serverId: serverID })

	const [isRefetching, setIsRefetching] = useState(false)

	// Note: I am not binding the refresh control to the isRefetching state from useSuspenseGraphQL because
	// I don't want background refetches to trigger the refresh control spinner
	const onRefresh = () => {
		setIsRefetching(true)
		refetch().finally(() => {
			setIsRefetching(false)
		})
	}

	const isDownloaded = useIsBookDownloaded(bookID, serverID)

	const accentColor = usePreferencesStore((state) => state.accentColor)

	const onDownloadBook = useCallback(async () => {
		if (isDownloaded || !book || isDownloading) return

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
		})
	}, [isDownloaded, downloadBook, book, isDownloading])

	const router = useRouter()
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
	const seriesPosition = Number(book.metadata?.number) || book.seriesPosition

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
			return <InfoStat label="Completed" value={`${percentage}%`} />
		}

		let percentage: number
		const decimal = percentageCompleted ? parseGraphQLDecimal(percentageCompleted) : null
		if (decimal) {
			percentage = Number((decimal * 100).toFixed(2))
		} else {
			percentage = Math.round(((page || 0) / pages) * 100)
		}
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

	const renderEpubLocator = ({ epubcfi, locator }: ActiveReadingSession) => {
		if (!locator && !epubcfi) {
			return null
		}

		if (locator) {
			const chapterTitle = locator.chapterTitle || locator.href || 'Unknown'
			return <InfoStat label="Chapter" value={chapterTitle} />
		} else {
			return <InfoStat label="Locator" value={`${epubcfi?.slice(0, 4)}...${epubcfi?.slice(-4)}`} />
		}
	}

	return (
		<SafeAreaView
			style={{ flex: 1 }}
			edges={[
				'left',
				'right',
				...(Platform.OS === 'ios' ? [] : ['bottom' as const, 'top' as const]),
			]}
		>
			<ScrollView
				className="flex-1 bg-background px-6"
				refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={onRefresh} />}
				contentInsetAdjustmentBehavior="automatic"
			>
				<View
					className={cn('flex-1 gap-8', {
						'pt-4': Platform.OS === 'ios',
					})}
				>
					{Platform.OS === 'android' && book && (
						<View className="flex flex-row justify-between pt-2">
							<Pressable onPress={() => router.back()}>
								<Icon as={ChevronLeft} className="h-6 w-6" />
							</Pressable>

							<BookActionMenu data={book} />
						</View>
					)}

					<View className="flex items-center gap-4">
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
					</View>

					<View className="gap-2">
						<Heading size="lg" className="text-center leading-6">
							{book.resolvedName}
						</Heading>

						{seriesName && seriesPosition != null && (
							<Text className="text-center text-base text-foreground-muted">
								{seriesPosition}
								{seriesPosition > book.series.mediaCount ? null : ` of ${book.series.mediaCount} `}
								in {seriesName}
							</Text>
						)}
					</View>

					<View className="flex w-full flex-row items-center gap-x-2 tablet:max-w-sm tablet:self-center">
						<Button
							className="flex-1 border border-edge"
							onPress={() =>
								router.push({
									// @ts-expect-error: It's fine
									pathname: `/server/${serverID}/books/${bookID}/read`,
								})
							}
						>
							{renderRead()}
						</Button>
						{checkPermission(UserPermission.DownloadFile) && !isDownloaded && (
							<Button
								variant="secondary"
								disabled={isDownloaded || isDownloading}
								onPress={onDownloadBook}
								className="flex-row gap-2"
							>
								{isDownloading && (
									<View className="pointer-events-none animate-spin">
										<Icon
											className="h-5 w-5"
											as={Loader2}
											style={{
												// @ts-expect-error: It's fine
												color: accentColor,
											}}
										/>
									</View>
								)}
								<Text>Download</Text>
							</Button>
						)}
					</View>

					{progression && (
						<View className="flex flex-row justify-around">
							{progression.page && <InfoStat label="Page" value={progression.page.toString()} />}
							{renderEpubLocator(progression)}
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

					<CardList label="Information">
						<InfoRow label="Identifier" value={book.id} />
						{book.metadata?.language && <InfoRow label="Language" value={book.metadata.language} />}
						<InfoRow label="Pages" value={pages.toString()} />
						<InfoRow label="Kind" value={book.extension.toUpperCase()} />
						{formattedSize && <InfoRow label="Size" value={formattedSize} />}
					</CardList>

					{!noExternalIdentifiers && (
						<CardList label="External Identifiers">
							{identifierAmazon && <InfoRow label="Amazon" value={identifierAmazon} />}
							{identifierCalibre && <InfoRow label="Calibre" value={identifierCalibre} />}
							{identifierGoogle && <InfoRow label="Google" value={identifierGoogle} />}
							{identifierIsbn && <InfoRow label="ISBN" value={identifierIsbn} />}
							{identifierMobiAsin && <InfoRow label="Mobi ASIN" value={identifierMobiAsin} />}
							{identifierUuid && <InfoRow label="UUID" value={identifierUuid} />}
						</CardList>
					)}

					<CardList label="Metadata" listEmptyStyle={{ message: 'No metadata available' }}>
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
					</CardList>

					{!noAcknowledgements && (
						<CardList label="Acknowledgements">
							{publisher && <InfoRow label="Publisher" value={publisher} />}
							{writers && <InfoRow label="Writers" value={writers} />}
							{colorists && <InfoRow label="Colorists" value={colorists} />}
							{inkers && <InfoRow label="Inkers" value={inkers} />}
							{letterers && <InfoRow label="Letterers" value={letterers} />}
							{coverArtists && <InfoRow label="Cover Artists" value={coverArtists} />}
						</CardList>
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
