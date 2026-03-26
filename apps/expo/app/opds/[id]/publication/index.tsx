import { FlashList } from '@shopify/flash-list'
import { useSDK } from '@stump/client'
import { OPDSLink, OPDSProgression, resolveUrl } from '@stump/sdk'
import { formatDistanceToNow, intlFormat } from 'date-fns'
import { useNavigation, useRouter } from 'expo-router'
import { Loader2 } from 'lucide-react-native'
import { useCallback, useEffect, useLayoutEffect, useMemo } from 'react'
import { Platform, View } from 'react-native'
import Animated from 'react-native-reanimated'
import TImage from 'react-native-turbo-image'

import { useActiveServer } from '~/components/activeServer'
import {
	DescriptionSection,
	IdentifiersSheet,
	InfoRow,
	useOverviewAnimations,
} from '~/components/book/overview'
import { ThumbnailImage } from '~/components/image'
import {
	CreditsSection,
	PublicationMenu,
	RelatedPublicationItem,
	useRelatedPublications,
} from '~/components/opds'
import FeedSelfURL from '~/components/opds/FeedSelfURL'
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
import { Button, Card, Heading, Icon, Text } from '~/components/ui'
import { formatSeriesPosition } from '~/lib/bookUtils'
import {
	useIsOPDSBookDownloading,
	useIsOPDSPublicationDownloaded,
	useOPDSDownload,
} from '~/lib/hooks'
import { usePreferencesStore } from '~/stores'

import { usePublicationContext } from './context'

export default function Screen() {
	const { sdk } = useSDK()
	const {
		activeServer: { id: serverID, kind },
	} = useActiveServer()
	const { publication, url, progression } = usePublicationContext()
	const { metadata, images, readingOrder, links, resources } = publication
	const { title, identifier, belongsTo } = metadata || {}

	const isStumpOPDS = kind === 'stump'

	const router = useRouter()
	const thumbnailRatio = usePreferencesStore((state) => state.thumbnailRatio)

	const isDownloaded = useIsOPDSPublicationDownloaded(url, metadata, serverID)

	const navigation = useNavigation()
	useLayoutEffect(() => {
		navigation.setOptions({
			title: title || 'Publication',
			headerRight: () => <PublicationMenu publicationUrl={url} metadata={metadata} />,
		})
	}, [navigation, url, title, metadata])

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
	const seriesPosition = formatSeriesPosition(belongsToSeries?.position ?? null, 0, {
		seriesName: belongsToSeries?.name ?? null,
	})
	const seriesText = seriesPosition ?? belongsToSeries?.name
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

	const { animatedScrollRef, parallaxStyle } = useOverviewAnimations()

	return (
		<Animated.ScrollView className="flex-1 bg-background" ref={animatedScrollRef}>
			<View className="ios:pt-safe-offset-20 pt-safe ios:pb-24 overflow-hidden pb-16">
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
							size={{ height: 235 / thumbnailRatio, width: 235 }}
							borderAndShadowStyle={{ shadowRadius: 5 }}
						/>
					</View>

					<View className="gap-2">
						<Heading size="lg" className="text-center leading-6" numberOfLines={3}>
							{title || 'Untitled'}
						</Heading>

						{seriesText && (
							<Text className="text-center text-base text-foreground-muted" numberOfLines={1}>
								{seriesText}
							</Text>
						)}
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

			<View className="squircle ios:rounded-[3rem] ios:-mt-[4.5rem] -mt-[2.5rem] gap-8 rounded-[2.5rem] bg-background px-4 py-6 tablet:px-6">
				{/* Note: I gave some of the rounded children here less border radius because it looked better to my eyes */}
				{!canDownload && !isDownloaded && (
					<View className="squircle ios:rounded-3xl rounded-2xl bg-fill-warning-secondary p-3">
						<Text>
							{!downloadURL
								? 'No download link available for this publication'
								: `Unsupported file format: ${acquisitionLink?.type || 'unknown'}`}
						</Text>
					</View>
				)}

				{!canStream && (
					<View className="squircle ios:rounded-3xl rounded-2xl bg-fill-info-secondary p-3">
						<Text>This publication lacks a defined reading order and cannot be streamed</Text>
					</View>
				)}

				{!isSupportedStream && (
					<View className="squircle ios:rounded-3xl rounded-2xl bg-fill-info-secondary p-3">
						<Text>
							This publication contains unsupported media types and cannot be streamed yet
						</Text>
					</View>
				)}

				{!!description && <DescriptionSection description={description} />}

				<Card>
					<Card.StatGroup>
						{!!publisher && <Card.Stat label="Publisher" value={publisher} />}
						{volume != null && <Card.Stat label="Volume" value={volume} />}
						{issue != null && <Card.Stat label="Issue" value={issue} />}
						{!!numberOfPages && <Card.Stat label="Pages" value={numberOfPages} />}
					</Card.StatGroup>
				</Card>

				<MetadataBadgeSection
					label="Subjects"
					items={subjects.map((subject) => ({
						label: subject.label,
						onPress: () => goToFeedLink(getFirstLink(subject.links)),
					}))}
				/>

				<CreditsSection
					metadata={metadata}
					onPressCredit={(credit) => goToFeedLink(getFirstLink(credit.links))}
				/>

				{seriesPublications.length > 0 && (
					<View className="gap-3">
						<View className="ios:px-4 flex flex-row items-center justify-between px-2">
							<Text className="text-lg font-semibold text-foreground-muted">
								{belongsToSeries?.name || 'Series Books'}
							</Text>
							{seriesUrl && <FeedSelfURL url={seriesUrl} />}
						</View>
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

				{collectionPublications.length > 0 && (
					<View className="gap-3">
						<View className="ios:px-4 flex flex-row items-center justify-between px-2">
							<Text className="text-lg font-semibold text-foreground-muted">
								{belongsToCollection?.name || 'Collection Books'}
							</Text>
							{collectionUrl && <FeedSelfURL url={collectionUrl} />}
						</View>
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

				<Card label="Details">
					{subtitle && <InfoRow label="Subtitle" value={subtitle} longValue />}
					{language && <InfoRow label="Language" value={language} />}
					{readingDirection && <InfoRow label="Reading direction" value={readingDirection} />}
					{modified && (
						<InfoRow
							label="Modified"
							value={intlFormat(modified, { month: 'long', day: 'numeric', year: 'numeric' })}
						/>
					)}
					{published && (
						<InfoRow
							label="Published"
							value={intlFormat(published, { month: 'long', day: 'numeric', year: 'numeric' })}
						/>
					)}
				</Card>

				{identifier && (
					<IdentifiersSheet
						identifiers={
							isStumpOPDS
								? {
										stumpId: identifier,
									}
								: {
										identifier,
									}
						}
					/>
				)}
			</View>
		</Animated.ScrollView>
	)
}
