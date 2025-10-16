import { useSDK, useSuspenseGraphQL } from '@stump/client'
import { BookByIdQuery, graphql } from '@stump/graphql'
import dayjs from 'dayjs'
import duration from 'dayjs/plugin/duration'
import relativeTime from 'dayjs/plugin/relativeTime'
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router'
import { ChevronLeft } from 'lucide-react-native'
import { useLayoutEffect } from 'react'
import { Platform, Pressable, View } from 'react-native'
import { ScrollView } from 'react-native-gesture-handler'
import { SafeAreaView } from 'react-native-safe-area-context'
import { stripHtml } from 'string-strip-html'

import { useActiveServer } from '~/components/activeServer'
import { BookMetaLink } from '~/components/book'
import { BookActionMenu } from '~/components/book/overview'
import { InfoRow, InfoSection, InfoStat } from '~/components/book/overview'
import LongValue from '~/components/book/overview/longValue/LongValue'
import { BorderAndShadow } from '~/components/BorderAndShadow'
import { TurboImage } from '~/components/Image'
import RefreshControl from '~/components/RefreshControl'
import { Button, Heading, Text } from '~/components/ui'
import { Icon } from '~/components/ui/icon'
import { formatBytes, parseGraphQLDecimal } from '~/lib/format'
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
						position
						totalProgression
					}
					href
				}
				startedAt
				elapsedSeconds
			}
			readHistory {
				completedAt
			}
			resolvedName
			series {
				resolvedName
				mediaCount
			}
			seriesPosition
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

// TODO: I think we can rethink some of this information arch. I originally just kinda dumped
// all of the metadata on the page but I think we can definitely curate some of it better to be
// prettier. Like {seriesPosition} of {series.mediaCount} in {seriesName} instead of just dumping
// the series-related metadata in a list.

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

	const noMetadata = !description && !seriesName && !genres && !characters

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
				refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
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
						<BorderAndShadow
							style={{ borderRadius: 10, borderWidth: 0.4, shadowRadius: 5, elevation: 8 }}
						>
							<TurboImage
								source={{
									uri: book.thumbnail.url,
									headers: {
										...sdk.customHeaders,
										Authorization: sdk.authorizationHeader || '',
									},
								}}
								resizeMode="stretch"
								resize={235 * 1.5}
								style={{ height: 235 / thumbnailRatio, width: 235 }}
							/>
						</BorderAndShadow>
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
						<Button variant="secondary" disabled>
							<Text>Download</Text>
						</Button>
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

					<InfoSection
						label="Information"
						rows={[
							<InfoRow key="identifier" label="Identifier" value={book.id} />,
							...(book.metadata?.language
								? [<InfoRow key="language" label="Language" value={book.metadata.language} />]
								: []),
							<InfoRow key="pages" label="Pages" value={pages.toString()} />,
							<InfoRow key="kind" label="Kind" value={book.extension.toUpperCase()} />,
							...(formattedSize ? [<InfoRow key="size" label="Size" value={formattedSize} />] : []),
						]}
					/>

					{!noExternalIdentifiers && (
						<InfoSection
							label="External Identifiers"
							rows={[
								...(identifierAmazon
									? [<InfoRow key="identifierAmazon" label="Amazon" value={identifierAmazon} />]
									: []),
								...(identifierCalibre
									? [<InfoRow key="identifierCalibre" label="Calibre" value={identifierCalibre} />]
									: []),
								...(identifierGoogle
									? [<InfoRow key="identifierGoogle" label="Google" value={identifierGoogle} />]
									: []),
								...(identifierIsbn
									? [<InfoRow key="identifierIsbn" label="ISBN" value={identifierIsbn} />]
									: []),
								...(identifierMobiAsin
									? [
											<InfoRow
												key="identifierMobiAsin"
												label="Mobi ASIN"
												value={identifierMobiAsin}
											/>,
										]
									: []),
							]}
						/>
					)}

					<InfoSection
						label="Metadata"
						rows={[
							...(noMetadata
								? [<InfoRow key="noMetadata" label="No metadata available" value="" />]
								: []),
							...(description
								? [
										<LongValue
											key="description"
											label="Description"
											value={stripHtml(description).result}
										/>,
									]
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
