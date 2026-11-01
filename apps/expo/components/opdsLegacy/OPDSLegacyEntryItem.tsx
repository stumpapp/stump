import { TrueSheet } from '@lodev09/react-native-true-sheet'
import { useSDK } from '@stump/client'
import {
	isLegacyDownloadableLink,
	isLegacyNavigationLink,
	isSubsectionLink,
	OPDSLegacyEntry,
} from '@stump/sdk'
import { useRouter } from 'expo-router'
import { Download, Info, Radio, Trash } from 'lucide-react-native'
import { useRef } from 'react'
import { Platform, View } from 'react-native'

import { useIsLegacyOPDSEntryDownloaded, useOPDSDownload, useTranslate } from '~/lib/hooks'
import { getLegacyStreamingData } from '~/lib/opdsLegacy/streaming'
import { useColorScheme } from '~/lib/useColorScheme'
import { cn } from '~/lib/utils'
import { useActiveServer } from '~/providers/ActiveServerProvider'
import { usePreferencesStore } from '~/stores'

import { useResolveURL } from '../../lib/opds/utils'
import { useFileExplorerAssets } from '../fileExplorer'
import { ThumbnailImage, TurboImage } from '../image'
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
	const { translate } = useTranslate()
	const {
		activeServer: { id: serverId },
	} = useActiveServer()
	const { itemWidth, thumbnailWidth, paddingHorizontal } = useLegacyOPDSEntrySize()
	const { downloadBook, deleteBook } = useOPDSDownload({ serverId: serverId })

	const isDownloaded = useIsLegacyOPDSEntryDownloaded(entry.id, serverId)
	const sheetRef = useRef<TrueSheet>(null)

	const assets = useFileExplorerAssets()
	const iconSource = getIconSource(entry, colorScheme, assets)

	const thumbnailRatio = usePreferencesStore((state) => state.thumbnailRatio)
	const layout = usePreferencesStore((state) => state.opdsLayout)

	const navigateUrl = entry.links.find(isLegacyNavigationLink)?.href || ''
	const subsectionUrl = entry.links.find(isSubsectionLink)?.href || ''
	const downloadLink = entry.links.find(isLegacyDownloadableLink)
	const thumbnailUrl = entry.links.find(
		(link) => link.rel === 'http://opds-spec.org/image/thumbnail',
	)?.href
	const streamingData = getLegacyStreamingData(entry, sdk?.rootURL)
	const isStreamable = !!streamingData

	const friendlyName = entry.title

	const router = useRouter()
	const resolveUrl = useResolveURL()

	const onPress = () => {
		const toUrl = navigateUrl || subsectionUrl
		if (streamingData) {
			router.push({
				pathname: `/opds-legacy/[serverId]/read`,
				params: {
					serverId,
					entryId: entry.id,
					entryTitle: entry.title,
					entryContent: entry.content,
					streamingURL: streamingData.streamingURL,
					pageCount: streamingData.pageCount.toString(),
				},
			})
		} else if (toUrl) {
			router.push({
				pathname: `/opds-legacy/[serverId]/feed/[url]`,
				params: {
					serverId,
					url: toUrl,
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
								label: translate('shared.bookActions.seeDetails'),
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
								label: translate('shared.common.download'),
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
											// TODO(ux): confirmation like in stump delete flow
											label: translate('shared.bookActions.deleteDownload.label'),
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
				{({ pressed }) => (
					<View
						className={cn('gap-1 items-center', {
							'gap-4 flex-row': layout === 'list',
						})}
						style={{
							opacity: pressed ? 0.75 : 1,
							paddingHorizontal,
						}}
					>
						{!thumbnailUrl && (
							<TurboImage
								source={{ uri: iconSource.localUri || iconSource.uri }}
								style={{ width: thumbnailWidth, height: thumbnailWidth }}
								// see https://github.com/stumpapp/stump/issues/1429
								allowHardware={Platform.OS !== 'android'}
							/>
						)}

						{thumbnailUrl && (
							<View className="my-2 relative">
								<ThumbnailImage
									source={{
										uri: resolveUrl(thumbnailUrl),
										headers: {
											...sdk.customHeaders,
											Authorization: sdk.authorizationHeader || '',
										},
									}}
									size={{
										height: thumbnailWidth / thumbnailRatio,
										width: thumbnailWidth,
									}}
									// see https://github.com/stumpapp/stump/issues/1429
									allowHardware={Platform.OS !== 'android'}
								/>

								{isStreamable && (
									<View className="squircle left-1 top-1 bg-black/70 p-2 absolute rounded-full">
										<Icon as={Radio} color="white" className="h-5 w-5" />
									</View>
								)}

								{isDownloaded && (
									<View className="squircle bottom-1 left-1 bg-black/70 p-2 absolute rounded-full">
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

							{layout === 'list' && streamingData?.pageCount != null && (
								<Text className="text-foreground-muted">
									{translate('shared.common.pagesCount', { count: streamingData.pageCount })}
								</Text>
							)}
						</View>
					</View>
				)}
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
