import { FlashList } from '@shopify/flash-list'
import { useSDK } from '@stump/client'
import { OPDSLink, OPDSProgression, resolveUrl } from '@stump/sdk'
import { formatDistanceToNow, intlFormat } from 'date-fns'
import { useRouter } from 'expo-router'
import { BookCopy, Info, Loader2 } from 'lucide-react-native'
import { useCallback, useEffect, useMemo } from 'react'
import { Platform, View } from 'react-native'
import Animated, {
	Extrapolation,
	interpolate,
	useAnimatedRef,
	useAnimatedStyle,
	useScrollOffset,
} from 'react-native-reanimated'
import TImage from 'react-native-turbo-image'

import { useActiveServer } from '~/components/activeServer'
import { InfoRow, LongValue } from '~/components/book/overview'
import ChevronBackLink from '~/components/ChevronBackLink'
import { ThumbnailImage } from '~/components/image'
import {
	CreditsSection,
	PublicationMenu,
	RelatedPublicationItem,
	useRelatedPublications,
} from '~/components/opds'
import {
	extensionFromMime,
	getAcquisitionLink,
	getDateField,
	getFirstLink,
	getFirstSubsectionLink,
	getLanguages,
	getLinkableMetadataArrayField,
	getNumberField,
	getPublicationThumbnailURL,
	getStringField,
} from '~/components/opds/utils'
import MetadataBadgeSection from '~/components/overview/MetadataBadgeSection'
import { Button, Card, Icon, Text } from '~/components/ui'
import {
	useIsOPDSBookDownloading,
	useIsOPDSPublicationDownloaded,
	useOPDSDownload,
} from '~/lib/hooks'
import { useDynamicHeader } from '~/lib/hooks/useDynamicHeader'
import { usePreferencesStore } from '~/stores'

import { usePublicationContext } from './context'

export default function Screen() {
	const { sdk } = useSDK()
	const {
		activeServer: { id: serverID },
	} = useActiveServer()
	const { publication, url, progression } = usePublicationContext()
	const { metadata, images, readingOrder, links, resources } = publication
	const { title, identifier, belongsTo } = metadata || {}

	const router = useRouter()
	const thumbnailRatio = usePreferencesStore((state) => state.thumbnailRatio)

	const isDownloaded = useIsOPDSPublicationDownloaded(url, metadata, serverID)

	useDynamicHeader({
		title: title || 'Publication',
		headerLeft: Platform.OS === 'ios' ? () => <ChevronBackLink /> : undefined,
		headerRight: () => <PublicationMenu publicationUrl={url} metadata={metadata} />,
	})

	// TODO: once I sort out progress sync, prefetch the current page
	// TODO: prefetch the first page of the publication, see https://github.com/candlefinance/faster-image/issues/73
	const firstPageURL = readingOrder?.[0]?.href
		? resolveUrl(readingOrder[0].href, sdk.rootURL)
		: undefined

	useEffect(() => {
		if (firstPageURL) {
			TImage.prefetch([
				{
					uri: firstPageURL,
					headers: {
						...sdk.customHeaders,
						Authorization: sdk.authorizationHeader || '',
					},
				},
			])
		}
	}, [sdk, firstPageURL])

	const { downloadBook } = useOPDSDownload({ serverId: serverID })

	const acquisitionLink = getAcquisitionLink(links)
	const downloadURL = acquisitionLink?.href
	const downloadExtension = extensionFromMime(acquisitionLink?.type)
	const canDownload = !!downloadURL && !!downloadExtension

	const isDownloading = useIsOPDSBookDownloading(downloadURL || url)

	const onDownloadBook = useCallback(async () => {
		if (isDownloaded || !canDownload || isDownloading) return

		return await downloadBook({
			publicationUrl: url,
			publication,
		})
	}, [isDownloaded, downloadBook, url, publication, canDownload, isDownloading])

	const thumbnailURL = getPublicationThumbnailURL(
		{
			images,
			readingOrder,
			resources,
		},
		sdk.rootURL,
	)

	// TODO: Eventually I'd like to curate the UI more based on the metadata
	// def better now but still a lot of just dumping on page

	const numberOfPages = getNumberField(metadata, 'numberOfPages') ?? readingOrder?.length
	const modified = getDateField(metadata, 'modified')
	const published = getDateField(metadata, 'published')
	const description = getStringField(metadata, 'description')
	const subtitle = getStringField(metadata, 'subtitle')
	const publisher = getLinkableMetadataArrayField(metadata, 'publisher')
		.map((entry) => entry.label)
		.join(', ')
	const language = getLanguages(metadata).join(', ') || null
	const readingDirection = getStringField(metadata, 'readingDirection')
	const volume = getNumberField(metadata, 'volume')
	const issue = getNumberField(metadata, 'issue')
	const subjects = getLinkableMetadataArrayField(metadata, 'subject')

	const belongsToSeries = useMemo(
		() => (Array.isArray(belongsTo?.series) ? belongsTo.series[0] : belongsTo?.series),
		[belongsTo],
	)
	const belongsToCollection = Array.isArray(belongsTo?.collection)
		? belongsTo.collection[0]
		: belongsTo?.collection

	const toResolvedURL = useCallback(
		(href?: string | null) => (href ? resolveUrl(href, sdk.rootURL) : undefined),
		[sdk.rootURL],
	)

	const goToFeedLink = useCallback(
		(link?: OPDSLink | null) => {
			if (!link?.href) return

			const resolvedURL = toResolvedURL(link.href)
			if (!resolvedURL) return

			router.push({
				pathname: '/opds/[id]/feed/[url]',
				params: { url: resolvedURL, id: serverID },
			})
		},
		[toResolvedURL, router, serverID],
	)

	const seriesLink = getFirstSubsectionLink(belongsToSeries?.links)
	const collectionLink = getFirstSubsectionLink(belongsToCollection?.links)
	const seriesUrl = toResolvedURL(seriesLink?.href)
	const collectionUrl = toResolvedURL(collectionLink?.href)

	const canStream = !!readingOrder && readingOrder.length > 0

	const {
		seriesPublications,
		initialSeriesPublicationIndex,
		fetchMoreSeriesPublications,
		collectionPublications,
		initialCollectionPublicationIndex,
		fetchMoreCollectionPublications,
		keyExtractor,
	} = useRelatedPublications({
		seriesUrl,
		collectionUrl,
		belongsTo,
	})

	const isSupportedStream = readingOrder?.every((link) => link.type?.startsWith('image/'))

	const accentColor = usePreferencesStore((state) => state.accentColor)

	const renderModifiedStat = (progression: OPDSProgression) => {
		if (!progression.modified) return null

		const percentageCompleted = progression.locator.locations?.totalProgression
		const isCompleted = !!(percentageCompleted && percentageCompleted >= 1)

		if (isCompleted) {
			return <Card.Stat label="Completed" value={formatDistanceToNow(progression.modified)} />
		} else {
			return (
				<Card.Stat
					label="Last read"
					value={formatDistanceToNow(progression.modified, { addSuffix: true })}
				/>
			)
		}
	}

	const existsSomeProgression =
		!!progression?.locator.locations?.position ||
		!!progression?.locator.locations?.totalProgression ||
		!!progression?.modified

	const animatedScrollRef = useAnimatedRef<Animated.ScrollView>()
	const scrollOffset = useScrollOffset(animatedScrollRef)

	const parallaxStyle = useAnimatedStyle(() => {
		return {
			transform: [
				{ translateY: interpolate(scrollOffset.value, [0, 200], [0, 100], Extrapolation.EXTEND) },
			],
		}
	})

	return (
		<Animated.ScrollView className="flex-1 bg-background" ref={animatedScrollRef}>
			<View className="ios:pt-safe-offset-20 overflow-hidden pb-8 pt-4">
				<Animated.View
					// -inset-24 is because when using a lot of blur, the sides get more transparent
					// so we have to "zoom in" to have a clean line at the bottom rather than a gradient
					className="absolute -inset-24 opacity-70 dark:opacity-30"
					style={parallaxStyle}
				>
					<TImage
						source={{
							uri: thumbnailURL || '',
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
					<View className="flex items-center gap-4">
						<ThumbnailImage
							source={{
								uri: thumbnailURL || '',
								headers: {
									...sdk.customHeaders,
									Authorization: sdk.authorizationHeader || '',
								},
							}}
							resizeMode="stretch"
							size={{ height: 235 / thumbnailRatio, width: 235 }}
						/>
					</View>

					<View className="flex w-full flex-row items-center gap-2 tablet:max-w-sm tablet:self-center">
						<Button
							variant="brand"
							className="flex-1"
							roundness="full"
							onPress={() =>
								router.push({
									pathname: `/opds/[id]/publication/read`,
									params: { url, id: serverID },
								})
							}
							disabled={!canStream || !isSupportedStream}
						>
							<Text>Stream</Text>
						</Button>
						{!isDownloaded && (
							<Button
								variant="secondary"
								roundness="full"
								disabled={!canDownload || isDownloading}
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

					{progression && existsSomeProgression && (
						<Card>
							<Card.StatGroup>
								{progression.locator.locations?.position && (
									<Card.Stat
										label="Page"
										value={progression.locator.locations.position || '1'}
										suffix={
											numberOfPages != null && numberOfPages > 0 ? ` / ${numberOfPages}` : undefined
										}
									/>
								)}
								{progression.locator.locations?.totalProgression != null && (
									<Card.Stat
										label="Completed"
										value={`${Math.round((progression.locator.locations?.totalProgression ?? 0) * 100)}%`}
									/>
								)}
								{renderModifiedStat(progression)}
							</Card.StatGroup>
						</Card>
					)}
				</View>
			</View>

			<View className="gap-8 px-4 py-8 tablet:px-6">
				{!canDownload && !isDownloaded && (
					<View className="squircle rounded-lg bg-fill-warning-secondary p-3">
						<Text>
							{!downloadURL
								? 'No download link available for this publication'
								: `Unsupported file format: ${acquisitionLink?.type || 'unknown'}`}
						</Text>
					</View>
				)}

				{!canStream && (
					<View className="squircle rounded-lg bg-fill-info-secondary p-3">
						<Text>This publication lacks a defined reading order and cannot be streamed</Text>
					</View>
				)}

				{!isSupportedStream && (
					<View className="squircle rounded-lg bg-fill-info-secondary p-3">
						<Text>
							This publication contains unsupported media types and cannot be streamed yet
						</Text>
					</View>
				)}

				<Card
					label="Information"
					listEmptyStyle={{ icon: Info, message: 'No information available' }}
				>
					{identifier && <InfoRow label="Identifier" value={identifier} longValue />}
					<InfoRow label="Title" value={title} longValue />
					{subtitle && <InfoRow label="Subtitle" value={subtitle} longValue />}
					{description && <LongValue label="Description" value={description} />}
					{modified && (
						<InfoRow
							label="Modified"
							value={intlFormat(modified, { month: 'long', day: 'numeric', year: 'numeric' })}
							longValue
						/>
					)}
					{publisher && <InfoRow label="Publisher" value={publisher} />}
					{published && (
						<InfoRow
							label="Published"
							value={intlFormat(published, { month: 'long', day: 'numeric', year: 'numeric' })}
						/>
					)}
					{!!numberOfPages && <InfoRow label="Number of pages" value={numberOfPages.toString()} />}
					{volume != null && <InfoRow label="Volume" value={volume.toString()} />}
					{issue != null && <InfoRow label="Issue" value={issue.toString()} />}
					{language && <InfoRow label="Language" value={language} />}
					{readingDirection && <InfoRow label="Reading direction" value={readingDirection} />}
				</Card>

				<Card label="Series" listEmptyStyle={{ icon: BookCopy, message: 'No series information' }}>
					{belongsToSeries?.name && <InfoRow label="Name" value={belongsToSeries.name} />}
					{belongsToSeries?.position && (
						<InfoRow label="Position" value={belongsToSeries.position.toString()} />
					)}

					{/* TODO: I don't love this design, just easiest right now */}
					{seriesUrl && (
						<Card.Row label="Feed">
							<Button
								onPress={() => goToFeedLink(seriesLink)}
								size="sm"
								variant="secondary"
								roundness="full"
								className="flex-row gap-2"
							>
								<Text>Go to series</Text>
							</Button>
						</Card.Row>
					)}
				</Card>

				{seriesPublications.length > 0 && (
					<View className="gap-3">
						<Text className="ios:px-4 px-2 text-lg font-semibold text-foreground-muted">
							Series Books
						</Text>
						<FlashList
							data={seriesPublications}
							renderItem={({ item }) => <RelatedPublicationItem item={item} />}
							horizontal
							showsHorizontalScrollIndicator={false}
							contentContainerStyle={{ paddingHorizontal: Platform.OS === 'ios' ? 16 : 8 }}
							initialScrollIndex={initialSeriesPublicationIndex}
							keyExtractor={keyExtractor}
							onEndReached={fetchMoreSeriesPublications}
						/>
					</View>
				)}

				{/* TODO: Support multiple collections, not sure what ideal UI might be for that */}
				{belongsToCollection && (
					<Card
						label="Collection"
						listEmptyStyle={{ icon: BookCopy, message: 'No collection information' }}
					>
						{belongsToCollection.name && <InfoRow label="Name" value={belongsToCollection.name} />}
						{belongsToCollection.position != null && (
							<InfoRow label="Position" value={belongsToCollection.position.toString()} />
						)}
					</Card>
				)}

				{/* TODO: See above ^ this will drastically change based on above. It might not
				 make sense to pull collections pubs if multiple are present */}
				{collectionPublications.length > 0 && (
					<View className="gap-3">
						<Text className="ios:px-4 px-2 text-lg font-semibold text-foreground-muted">
							Collection Books
						</Text>
						<FlashList
							data={collectionPublications}
							renderItem={({ item }) => <RelatedPublicationItem item={item} />}
							horizontal
							showsHorizontalScrollIndicator={false}
							contentContainerStyle={{ paddingHorizontal: Platform.OS === 'ios' ? 16 : 8 }}
							initialScrollIndex={initialCollectionPublicationIndex}
							keyExtractor={keyExtractor}
							onEndReached={fetchMoreCollectionPublications}
						/>
					</View>
				)}

				<CreditsSection
					metadata={metadata}
					onPressCredit={(credit) => goToFeedLink(getFirstLink(credit.links))}
				/>

				<MetadataBadgeSection
					label="Subjects"
					items={subjects.map((subject) => ({
						label: subject.label,
						onPress: () => goToFeedLink(getFirstLink(subject.links)),
					}))}
				/>
			</View>
		</Animated.ScrollView>
	)
}
