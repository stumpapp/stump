import { FlashList } from '@shopify/flash-list'
import { useSDK } from '@stump/client'
import { OPDSLink, resolveUrl } from '@stump/sdk'
import { useNavigation, useRouter } from 'expo-router'
import { Loader2 } from 'lucide-react-native'
import { useCallback, useEffect, useLayoutEffect, useMemo, useState } from 'react'
import { Platform, View } from 'react-native'
import Animated from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import TImage from 'react-native-turbo-image'

import {
	CurrentProgressCard,
	DescriptionSection,
	DetailsCard,
	IdentifiersSheet,
	OverviewBackground,
	ProminentMetadataCard,
	TitleSection,
	useOverviewAnimations,
} from '~/components/book/overview'
import { useResolvedHeaderHeight } from '~/components/header/useAnimatedHeader'
import { ThumbnailImage } from '~/components/image'
import { CreditsSection, RelatedPublicationItem, useRelatedPublications } from '~/components/opds'
import FeedSelfURL from '~/components/opds/FeedSelfURL'
import { usePublicationMenu } from '~/components/opds/PublicationMenu'
import MetadataBadgeSection from '~/components/overview/MetadataBadgeSection'
import { Button, Card, Icon, Text } from '~/components/ui'
import { formatSeriesPosition } from '~/lib/bookUtils'
import { usePalette } from '~/lib/constants'
import {
	useIsOPDSBookDownloading,
	useIsOPDSPublicationDownloaded,
	useOPDSDownload,
	useTranslate,
} from '~/lib/hooks'
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
} from '~/lib/opds/utils'
import { cn } from '~/lib/utils'
import { useActiveServer } from '~/providers/ActiveServerProvider'
import { usePreferencesStore } from '~/stores'

import { usePublicationContext } from './context'

export default function Screen() {
	const { t } = useTranslate()
	const { sdk } = useSDK()
	const {
		activeServer: { id: serverId, kind },
	} = useActiveServer()
	const { publication, url, progression } = usePublicationContext()
	const { metadata, images, readingOrder, links, resources } = publication
	const { title, identifier, belongsTo } = metadata || {}

	const isStumpOPDS = kind === 'stump'

	const router = useRouter()
	const thumbnailRatio = usePreferencesStore((state) => state.thumbnailRatio)

	const isDownloaded = useIsOPDSPublicationDownloaded(url, metadata, serverId)

	const navigation = useNavigation()
	useLayoutEffect(() => {
		navigation.setOptions({
			title: title || 'Publication',
			// headerRight: () => <PublicationMenu publicationUrl={url} metadata={metadata} />,
		})
	}, [navigation, url, title, metadata])

	const menuFragment = usePublicationMenu({
		publicationUrl: url,
		metadata,
	})

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

	const { downloadBook } = useOPDSDownload({ serverId: serverId })

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

		t,
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
				pathname: '/opds/[serverId]/feed/[url]',
				params: { url: resolvedURL, serverId },
			})
		},
		[toResolvedURL, router, serverId],
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

	const accentColor = usePalette('accent')

	const existsSomeProgression =
		!!progression?.locator.locations?.position ||
		!!progression?.locator.locations?.totalProgression ||
		!!progression?.modified

	const { animatedScrollRef, parallaxStyle } = useOverviewAnimations()
	const [mainSectionHeight, setMainSectionHeight] = useState<number>()
	const insets = useSafeAreaInsets()
	const headerHeight = useResolvedHeaderHeight()

	return (
		<>
			{menuFragment}

			<OverviewBackground
				source={{
					uri: thumbnailURL || '',
					headers: {
						...sdk.customHeaders,
						Authorization: sdk.authorizationHeader || '',
					},
				}}
				parallaxStyle={parallaxStyle}
				mainSectionHeight={mainSectionHeight}
			/>

			<Animated.ScrollView
				className="flex-1"
				ref={animatedScrollRef}
				contentInsetAdjustmentBehavior="automatic"
				style={{
					marginBottom: Platform.OS === 'android' ? insets.bottom : undefined,
				}}
			>
				{/*lol this is absurd!*/}
				<View style={{ height: Platform.OS === 'android' ? headerHeight : 0 }} />
				<View
					className="gap-6 px-4 tablet:px-6 ios:pb-24 pb-16"
					onLayout={(e) => setMainSectionHeight(e.nativeEvent.layout.height)}
				>
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

					<TitleSection title={title} subtitle={subtitle} series={seriesText} />

					<View className="gap-2 tablet:max-w-sm flex w-full flex-row items-center tablet:self-center">
						<Button
							variant="brand"
							className="flex-1"
							roundness="full"
							onPress={() =>
								router.push({
									pathname: `/opds/[serverId]/publication/read`,
									params: { url, serverId },
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
								className="gap-2 flex-row"
							>
								{isDownloading && (
									<View className="animate-spin pointer-events-none">
										<Icon className="h-5 w-5" as={Loader2} color={accentColor} />
									</View>
								)}
								<Text>Download</Text>
							</Button>
						)}
					</View>

					<CurrentProgressCard
						hidden={!(progression && existsSomeProgression)}
						showChapterTitle={false}
						progressData={{
							chapterTitle: null,
							page: progression?.locator.locations?.position,
							totalPages: numberOfPages,
							percentage: Math.round((progression?.locator.locations?.totalProgression ?? 0) * 100),
							// TODO: pull from local db
							readingTimeSeconds: null,
							lastRead: progression?.modified,
						}}
					/>

					<Card backgroundClassName="bg-fill-warning-secondary dark:bg-fill-warning-secondary">
						{!canDownload && !isDownloaded && (
							<Card.Row>
								<Text>
									{!downloadURL
										? 'No download link available for this publication'
										: `Unsupported file format: ${acquisitionLink?.type || 'unknown'}`}
								</Text>
							</Card.Row>
						)}
						{!canStream && (
							<Card.Row>
								<Text>This publication lacks a defined reading order and cannot be streamed</Text>
							</Card.Row>
						)}
						{!isSupportedStream && (
							<Card.Row>
								<Text>
									This publication contains unsupported media types and cannot be streamed yet
								</Text>
							</Card.Row>
						)}
					</Card>
				</View>

				<View className="squircle ios:rounded-[3rem] ios:-mt-[4.5rem] gap-8 px-4 py-6 tablet:px-6 -mt-[2.5rem] rounded-[2.5rem] bg-background">
					{!!description && <DescriptionSection description={description} />}

					<ProminentMetadataCard
						className={cn(!description && 'px-2')}
						metadata={{
							publisher: publisher,
							volume: volume,
							year: published?.getFullYear(),
							issue: issue,
							pages: numberOfPages,
						}}
					/>

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
							<View className="ios:px-4 px-2 flex flex-row items-center justify-between">
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
							<View className="ios:px-4 px-2 flex flex-row items-center justify-between">
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

					<DetailsCard
						metadata={{
							language: language,
							readingDirection: readingDirection,
							published: published,
							modified: modified,
						}}
					/>

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
		</>
	)
}
