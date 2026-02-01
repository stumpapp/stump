import { useSDK } from '@stump/client'
import { isLegacyDownloadableLink, isLegacyNavigationLink, OPDSLegacyEntry } from '@stump/sdk'
import { useRouter } from 'expo-router'
import { Image, Platform, Pressable, View } from 'react-native'

import { getLegacyPageStreamingURL } from '~/context/opdsLegacy'
import { useColorScheme } from '~/lib/useColorScheme'
import { usePreferencesStore } from '~/stores'

import { useActiveServer } from '../activeServer'
import { useFileExplorerAssets } from '../fileExplorer'
import { ThumbnailImage, TurboImage } from '../image'
import { useResolveURL } from '../opds/utils'
import { Text } from '../ui'

type Props = {
	entry: OPDSLegacyEntry
}

export default function OPDSEntry({ entry }: Props) {
	const { colorScheme } = useColorScheme()
	const { sdk } = useSDK()
	const {
		activeServer: { id: serverID },
	} = useActiveServer()

	const assets = useFileExplorerAssets()
	const iconSource = getIconSource(entry, colorScheme, assets)

	const thumbnailRatio = usePreferencesStore((state) => state.thumbnailRatio)

	const navigateUrl = entry.links.find(isLegacyNavigationLink)?.href || ''
	const downloadUrl = entry.links.find(isLegacyDownloadableLink)?.href || ''
	const thumbnailUrl = entry.links.find(
		(link) => link.rel === 'http://opds-spec.org/image/thumbnail',
	)?.href
	const streamUrl = getLegacyPageStreamingURL(entry, sdk?.rootURL)

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
		} else if (streamUrl) {
			// TODO: Check acquisition type to determine if we can stream?
			console.log('Streaming from URL:', resolveUrl(streamUrl))
			// router.push({
			// 	pathname: `/opds-legacy/[id]/read`,
			// 	params: {
			// 		id: serverID,
			// 		url: streamUrl,
			// 	},
			// })
		} else if (downloadUrl) {
			console.log('Downloading from URL:', resolveUrl(downloadUrl))
		} else {
			console.warn('No valid action for this entry.')
		}
	}

	return (
		<Pressable onPress={onPress}>
			{({ pressed }) => (
				<View className="items-center" style={{ opacity: pressed ? 0.75 : 1 }}>
					{!thumbnailUrl &&
						Platform.select({
							ios: (
								<TurboImage
									source={{ uri: iconSource.localUri || iconSource.uri }}
									style={{ width: 100, height: 100 }}
									resize={100 * 1.5}
								/>
							),
							android: (
								<Image
									// @ts-expect-error: It's fine
									source={iconSource}
									style={{ width: 100, height: 100 }}
								/>
							),
						})}

					{thumbnailUrl && (
						<ThumbnailImage
							source={{
								uri: resolveUrl(thumbnailUrl),
								headers: {
									...sdk.customHeaders,
									Authorization: sdk.authorizationHeader || '',
								},
							}}
							resizeMode="stretch"
							size={{ height: 70 / thumbnailRatio, width: 70 }}
						/>
					)}

					<View>
						<Text className="text-base font-medium" numberOfLines={1}>
							{friendlyName}
						</Text>
					</View>
				</View>
			)}
		</Pressable>
	)
}

const getIconSource = (
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
