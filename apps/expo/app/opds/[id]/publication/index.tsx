import { useSDK } from '@stump/client'
import { OPDSProgression, resolveUrl } from '@stump/sdk'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import { useRouter } from 'expo-router'
import { BookCopy, Info, Loader2 } from 'lucide-react-native'
import { useCallback, useEffect } from 'react'
import { Platform, Pressable, View } from 'react-native'
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
import { PublicationMenu } from '~/components/opds'
import {
	extensionFromMime,
	getAcquisitionLink,
	getDateField,
	getNumberField,
	getPublicationThumbnailURL,
	getStringField,
} from '~/components/opds/utils'
import { Button, Card, Icon, Text } from '~/components/ui'
import {
	useIsOPDSBookDownloading,
	useIsOPDSPublicationDownloaded,
	useOPDSDownload,
} from '~/lib/hooks'
import { useDynamicHeader } from '~/lib/hooks/useDynamicHeader'
import { cn } from '~/lib/utils'
import { usePreferencesStore } from '~/stores'

import { usePublicationContext } from './context'

dayjs.extend(relativeTime)

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

	const numberOfPages = getNumberField(metadata, 'numberOfPages') ?? readingOrder?.length
	const modified = getDateField(metadata, 'modified')
	const description = getStringField(metadata, 'description')

	const belongsToSeries = Array.isArray(belongsTo?.series) ? belongsTo.series[0] : belongsTo?.series
	const seriesURL = belongsToSeries?.links?.find((link) => link.rel === 'self')?.href
	const resolvedSeriesURL = seriesURL ? resolveUrl(seriesURL, sdk.rootURL) : undefined

	const canStream = !!readingOrder && readingOrder.length > 0
	const isSupportedStream = readingOrder?.every((link) => link.type?.startsWith('image/'))

	const accentColor = usePreferencesStore((state) => state.accentColor)

	const renderModifiedStat = (progression: OPDSProgression) => {
		const percentageCompleted = progression.locator.locations?.totalProgression
		const isCompleted = !!(percentageCompleted && percentageCompleted >= 1)

		if (isCompleted) {
			// TODO: I vaguely remember an alternative to dayjs someone showed me but for the life of me I can't remember what it was
			// If I remember later I'll swap it out
			return <Card.Stat label="Completed" value={dayjs(progression.modified).fromNow(true)} />
		} else {
			return <Card.Stat label="Last read" value={dayjs(progression.modified).fromNow()} />
		}
	}

	const animatedScrollRef = useAnimatedRef<Animated.ScrollView>()
	const scrollOffset = useScrollOffset(animatedScrollRef)

	const parallaxStyle = useAnimatedStyle(() => {
		return {
			transform: [
				{ translateY: interpolate(scrollOffset.value, [0, 200], [0, 100], Extrapolation.EXTEND) },
			],
		}
	})

	// TODO: dump the rest of the metadata? Or enforce servers to conform to a standard?
	// const restMeta = omit(rest, ['numberOfPages', 'modified'])

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

					{progression && (
						<Card>
							<Card.StatGroup>
								{progression.locator.locations?.position && (
									<Card.Stat
										label="Page"
										value={progression.locator.locations.position || '1'}
										suffix={` / ${numberOfPages}`}
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
					{description && <LongValue label="Description" value={description} />}
					{modified && (
						<InfoRow label="Modified" value={modified.format('MMMM DD, YYYY')} longValue />
					)}
					{!!numberOfPages && (
						<InfoRow label="Number of pages" value={numberOfPages.toString()} longValue />
					)}
				</Card>

				<Card label="Series" listEmptyStyle={{ icon: BookCopy, message: 'No series information' }}>
					{belongsToSeries?.name && <InfoRow label="Name" value={belongsToSeries.name} />}
					{belongsToSeries?.position && (
						<InfoRow label="Position" value={belongsToSeries.position.toString()} />
					)}

					{resolvedSeriesURL && (
						<View className="flex flex-row items-center justify-between py-1">
							<Text className="shrink-0 text-foreground-subtle">Feed URL</Text>
							<Pressable
								onPress={() =>
									router.push({
										pathname: '/opds/[id]/feed/[url]',
										params: { url: resolvedSeriesURL, id: serverID },
									})
								}
							>
								{({ pressed }) => (
									<View
										className={cn(
											'squircle rounded-lg border border-edge bg-background-surface-secondary p-1 px-3 text-center',
											{
												'opacity-80': pressed,
											},
										)}
									>
										<Text>Go to feed</Text>
									</View>
								)}
							</Pressable>
						</View>
					)}
				</Card>
			</View>
		</Animated.ScrollView>
	)
}
