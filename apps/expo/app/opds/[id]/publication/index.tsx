import { useSDK } from '@stump/client'
import { OPDSProgression } from '@stump/sdk'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import { useRouter } from 'expo-router'
import { BookCopy, Info, Loader2 } from 'lucide-react-native'
import { useCallback } from 'react'
import { Platform, Pressable, View } from 'react-native'
import { ScrollView } from 'react-native-gesture-handler'
import { SafeAreaView } from 'react-native-safe-area-context'

import { useActiveServer } from '~/components/activeServer'
import { InfoRow, InfoStat } from '~/components/book/overview'
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
import { Button, CardList, Icon, Text } from '~/components/ui'
import { useIsOPDSPublicationDownloaded, useOPDSDownload } from '~/lib/hooks'
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
	// const firstPageURL = readingOrder?.[0]?.href
	// useEffect(() => {
	// 	if (firstPageURL) {
	// 		EImage.prefetch(firstPageURL, {
	// 			headers: {
	// 				Authorization: sdk.authorizationHeader || '',
	// 			},
	// 		})
	// 	}
	// }, [sdk, firstPageURL])

	const { downloadBook, isDownloading } = useOPDSDownload({ serverId: serverID })

	const acquisitionLink = getAcquisitionLink(links)
	const downloadURL = acquisitionLink?.href
	const downloadExtension = extensionFromMime(acquisitionLink?.type)
	const canDownload = !!downloadURL && !!downloadExtension

	const onDownloadBook = useCallback(async () => {
		if (isDownloaded || !canDownload || isDownloading) return

		return await downloadBook({
			publicationUrl: url,
			publication,
		})
	}, [isDownloaded, downloadBook, url, publication, canDownload, isDownloading])

	const thumbnailURL = getPublicationThumbnailURL({
		images,
		readingOrder,
		resources,
	})

	const numberOfPages = getNumberField(metadata, 'numberOfPages') ?? readingOrder?.length
	const modified = getDateField(metadata, 'modified')
	const description = getStringField(metadata, 'description')

	const belongsToSeries = Array.isArray(belongsTo?.series) ? belongsTo.series[0] : belongsTo?.series
	const seriesURL = belongsToSeries?.links?.find((link) => link.rel === 'self')?.href

	const canStream = !!readingOrder && readingOrder.length > 0
	const isSupportedStream = readingOrder?.every((link) => link.type?.startsWith('image/'))

	const accentColor = usePreferencesStore((state) => state.accentColor)

	const renderModifiedStat = (progression: OPDSProgression) => {
		const percentageCompleted = progression.locator.locations?.at(0)?.totalProgression
		const isCompleted = !!(percentageCompleted && percentageCompleted >= 1)

		if (isCompleted) {
			// TODO: I vaguely remember an alternative to dayjs someone showed me but for the life of me I can't remember what it was
			// If I remember later I'll swap it out
			return <InfoStat label="Completed" value={dayjs(progression.modified).fromNow(true)} />
		} else {
			return <InfoStat label="Last read" value={dayjs(progression.modified).fromNow()} />
		}
	}

	// TODO: dump the rest of the metadata? Or enforce servers to conform to a standard?
	// const restMeta = omit(rest, ['numberOfPages', 'modified'])

	return (
		<SafeAreaView
			style={{ flex: 1 }}
			edges={Platform.OS === 'ios' ? ['top', 'left', 'right'] : ['left', 'right']}
		>
			<ScrollView
				className="flex-1 gap-5 bg-background px-4 tablet:px-6"
				contentInsetAdjustmentBehavior="automatic"
			>
				<View className="flex-1 gap-8 py-4">
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
							className="flex-1 border border-edge"
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
						<View className="flex flex-row justify-around">
							{progression.locator.locations?.at(0)?.position && (
								<InfoStat
									label="Page"
									value={progression.locator.locations.at(0)?.position?.toString() || '1'}
								/>
							)}
							{progression.locator.locations?.at(0)?.totalProgression != null && (
								<InfoStat
									label="Completed"
									value={`${Math.round((progression.locator.locations.at(0)?.totalProgression ?? 0) * 100)}%`}
								/>
							)}
							{renderModifiedStat(progression)}
						</View>
					)}

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

					<CardList
						label="Information"
						listEmptyStyle={{ icon: Info, message: 'No information available' }}
					>
						{identifier && <InfoRow label="Identifier" value={identifier} longValue />}
						<InfoRow label="Title" value={title} longValue />
						{description && <InfoRow label="Description" value={description} longValue />}
						{modified && (
							<InfoRow label="Modified" value={modified.format('MMMM DD, YYYY')} longValue />
						)}
						{!!numberOfPages && (
							<InfoRow label="Number of pages" value={numberOfPages.toString()} longValue />
						)}
					</CardList>

					<CardList
						label="Series"
						listEmptyStyle={{ icon: BookCopy, message: 'No series information' }}
					>
						{belongsToSeries?.name && <InfoRow label="Name" value={belongsToSeries.name} />}
						{belongsToSeries?.position && (
							<InfoRow label="Position" value={belongsToSeries.position.toString()} />
						)}

						{seriesURL && (
							<View className="flex flex-row items-center justify-between py-1">
								<Text className="shrink-0 text-foreground-subtle">Feed URL</Text>
								<Pressable
									onPress={() =>
										router.push({
											pathname: '/opds/[id]/feed/[url]',
											params: { url: seriesURL, id: serverID },
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
					</CardList>
				</View>
			</ScrollView>
		</SafeAreaView>
	)
}
