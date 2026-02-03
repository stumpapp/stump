import { TrueSheet } from '@lodev09/react-native-true-sheet'
import { useSDK } from '@stump/client'
import { isLegacyDownloadableLink, isLegacyNavigationLink, OPDSLegacyEntry } from '@stump/sdk'
import { useRouter } from 'expo-router'
import { Download, Info, Radio, Trash } from 'lucide-react-native'
import { useRef } from 'react'
import { Image, Platform, Pressable, View } from 'react-native'

import { getLegacyStreamingContextValue } from '~/context/opdsLegacy'
import { useIsLegacyOPDSEntryDownloaded, useOPDSDownload } from '~/lib/hooks'
import { useColorScheme } from '~/lib/useColorScheme'
import { cn } from '~/lib/utils'
import { useOPDSPreferencesStore, usePreferencesStore } from '~/stores'

import { useActiveServer } from '../activeServer'
import { useFileExplorerAssets } from '../fileExplorer'
import { ThumbnailImage, TurboImage } from '../image'
import { useResolveURL } from '../opds/utils'
import { Icon, Text } from '../ui'
import { ContextMenu } from '../ui/context-menu/context-menu'
import { OPDSLegacyEntryItemSheet } from './OPDSLegacyEntryItemSheet'
import { useLegacyOPDSEntrySize } from './useLegacyOPDSEntrySize'

type Props = {
	entry: OPDSLegacyEntry
}

export default function OPDSEntry({ entry }: Props) {
	const { colorScheme } = useColorScheme()
	const { sdk } = useSDK()
	const {
		activeServer: { id: serverID },
	} = useActiveServer()
	const { itemWidth, thumbnailWidth, paddingHorizontal } = useLegacyOPDSEntrySize()
	const { downloadBook, deleteBook } = useOPDSDownload({ serverId: serverID })

	const isDownloaded = useIsLegacyOPDSEntryDownloaded(entry.id, serverID)
	const sheetRef = useRef<TrueSheet>(null)

	const assets = useFileExplorerAssets()
	const iconSource = getIconSource(entry, colorScheme, assets)

	const thumbnailRatio = usePreferencesStore((state) => state.thumbnailRatio)
	const layout = useOPDSPreferencesStore((state) => state.layout)

	const navigateUrl = entry.links.find(isLegacyNavigationLink)?.href || ''
	const downloadLink = entry.links.find(isLegacyDownloadableLink)
	const thumbnailUrl = entry.links.find(
		(link) => link.rel === 'http://opds-spec.org/image/thumbnail',
	)?.href
	const streamingContext = getLegacyStreamingContextValue(entry, sdk?.rootURL)
	const isStreamable = !!streamingContext

	const friendlyName = entry.title

	const router = useRouter()
	const resolveUrl = useResolveURL()

	const onPress = () => {
		if (navigateUrl) {
			router.push({
				pathname: `/opds-legacy/[id]/feed/[url]`,
				params: {
					id: serverID,
					url: navigateUrl,
				},
			})
		} else if (streamingContext) {
			router.push({
				pathname: `/opds-legacy/[id]/read`,
				params: {
					id: serverID,
					entryId: entry.id,
					entryTitle: entry.title,
					entryContent: entry.content,
					streamingURL: streamingContext.streamingURL,
					pageCount: streamingContext.pageCount.toString(),
				},
			})
		} else {
			console.warn('No valid pressable action for this entry.')
		}
	}

	return (
		<>
			<ContextMenu
				onPress={onPress}
				groups={[
					{
						items: [
							{
								label: 'See Details',
								icon: {
									ios: 'info.circle',
									android: Info,
								},
								onPress: () => sheetRef.current?.present(),
							},
							// {
							// 	label: 'Select',
							// 	icon: {
							// 		ios: 'checkmark.circle',
							// 		android: CheckCircle2,
							// 	},
							// 	onPress: handleSelect,
							// },
						],
					},
					{
						items: [
							{
								label: 'Download',
								disabled: !downloadLink || isDownloaded,
								onPress: () => {
									if (!downloadLink) return

									downloadBook({
										id: entry.id,
										publicationUrl: downloadLink.href,
										publication: {
											metadata: {
												title: entry.title,
												subtitle: entry.content,
												modified: entry.updated,
											},
											// Note: The OPDS download flow was built around OPDS v2, and so this
											// is a bit of a translation hack to get it working without having to
											// comletely rewrite the flow for legacy OPDS
											links: [
												{
													title: downloadLink.title,
													href: downloadLink.href,
													rel: 'http://opds-spec.org/acquisition',
													type: downloadLink.type,
												},
											],
										},
									})
								},
								icon: {
									ios: 'arrow.down.circle',
									android: Download,
								},
							},
						],
					},
					...(isDownloaded
						? [
								{
									items: [
										{
											label: 'Delete Download',
											onPress: () => {
												deleteBook({
													id: entry.id,
													publicationUrl: downloadLink?.href || '',
												})
											},
											icon: {
												ios: 'trash',
												android: Trash,
											},
											role: 'destructive',
										} as const,
									],
								},
							]
						: []),
				]}
			>
				<Pressable onPress={onPress}>
					{({ pressed }) => (
						<View
							className={cn('items-center gap-1', {
								'flex-row gap-4': layout === 'list',
							})}
							style={{
								opacity: pressed ? 0.75 : 1,
								paddingHorizontal,
							}}
						>
							{!thumbnailUrl &&
								Platform.select({
									ios: (
										<TurboImage
											source={{ uri: iconSource.localUri || iconSource.uri }}
											style={{ width: thumbnailWidth, height: thumbnailWidth }}
										/>
									),
									android: (
										<Image
											// @ts-expect-error: It's fine
											source={iconSource}
											style={{ width: thumbnailWidth, height: thumbnailWidth }}
										/>
									),
								})}

							{thumbnailUrl && (
								<View className="relative my-2">
									<ThumbnailImage
										source={{
											uri: resolveUrl(thumbnailUrl),
											headers: {
												...sdk.customHeaders,
												Authorization: sdk.authorizationHeader || '',
											},
										}}
										resizeMode="stretch"
										size={{
											height: thumbnailWidth / thumbnailRatio,
											width: thumbnailWidth,
										}}
									/>

									{isStreamable && (
										<View className="squircle absolute left-1 top-1 rounded-full bg-black/70 p-2">
											<Icon as={Radio} color="white" className="h-5 w-5" />
										</View>
									)}

									{isDownloaded && (
										<View className="squircle absolute bottom-1 left-1 rounded-full bg-black/70 p-2">
											<Download color="white" className="h-5 w-5" />
										</View>
									)}
								</View>
							)}

							<View
								style={{
									width: layout === 'grid' ? itemWidth - 16 : undefined,
									flex: layout === 'list' ? 1 : undefined,
									flexShrink: layout === 'list' ? 1 : undefined,
								}}
							>
								<Text
									className={cn('text-base font-medium', {
										'text-center': layout === 'grid',
									})}
									numberOfLines={2}
								>
									{friendlyName}
								</Text>

								{layout === 'list' && streamingContext?.pageCount != null && (
									<Text className="text-foreground-muted">{streamingContext.pageCount} pages</Text>
								)}
							</View>
						</View>
					)}
				</Pressable>
			</ContextMenu>

			<OPDSLegacyEntryItemSheet ref={sheetRef} entry={entry} />
		</>
	)
}

export const getIconSource = (
	entry: OPDSLegacyEntry,
	theme: 'light' | 'dark',
	assets: ReturnType<typeof useFileExplorerAssets>,
) => {
	const isPublication = entry.links.some((link) =>
		['http://opds-spec.org/acquisition', 'http://opds-spec.org/acquisition/open-access'].includes(
			link.rel || '',
		),
	)
	const isNavigation = !isPublication

	if (isNavigation) {
		return theme === 'light' ? assets.folderLight : assets.folder
	}

	const mimeType = entry.links.find((link) => link.rel === 'http://opds-spec.org/acquisition')?.type

	const isZipVariant = mimeType === 'application/zip' || mimeType === 'application/epub+zip'

	if (isZipVariant) {
		return theme === 'light' ? assets.archiveLight : assets.archive
	} else {
		return theme === 'light' ? assets.documentLight : assets.document
	}
}
