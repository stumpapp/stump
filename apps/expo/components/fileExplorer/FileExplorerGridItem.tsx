import { ARCHIVE_EXTENSION, EBOOK_EXTENSION, PDF_EXTENSION, useSDK } from '@stump/client'
import { DirectoryListingQuery } from '@stump/graphql'
import { useRouter } from 'expo-router'
import { useCallback } from 'react'
import { Image, Platform, Pressable, View } from 'react-native'

import { useColorScheme } from '~/lib/useColorScheme'
import { usePreferencesStore } from '~/stores'

import { useActiveServer } from '../activeServer'
import { ThumbnailImage, TurboImage } from '../image'
import { Text } from '../ui'
import { useFileExplorerAssets } from './FileExplorerAssetsContext'

type ListedFile = DirectoryListingQuery['listDirectory']['nodes'][number]['files'][number]

type Props = {
	file: ListedFile
}

export default function FileExplorerGridItem({ file }: Props) {
	const { colorScheme } = useColorScheme()
	const assets = useFileExplorerAssets()
	const iconSource = getIconSource(file, colorScheme, assets)
	const { sdk } = useSDK()
	const {
		activeServer: { id: serverID },
	} = useActiveServer()

	const router = useRouter()

	const thumbnailRatio = usePreferencesStore((state) => state.thumbnailRatio)

	const friendlyName = file?.media?.resolvedName || file.name

	const onSelect = useCallback(() => {
		if (file.isDirectory) {
			router.push({
				pathname: `/server/[id]/files/[path]`,
				params: {
					id: serverID,
					path: file.path,
					friendlyName,
				},
			})
		} else if (file.media) {
			router.push(`/server/${serverID}/books/${file.media.id}`)
		}
	}, [file, router, serverID, friendlyName])

	return (
		<Pressable onPress={onSelect}>
			{({ pressed }) => (
				<View className="items-center" style={{ opacity: pressed ? 0.75 : 1 }}>
					{!file.media &&
						// FIXME: On Android TurboImage doesn't work with local assets in production builds
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
					{!!file.media?.thumbnail.url && (
						<ThumbnailImage
							source={{
								uri: file.media.thumbnail.url,
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
	file: ListedFile,
	theme: 'light' | 'dark',
	assets: ReturnType<typeof useFileExplorerAssets>,
) => {
	if (file.isDirectory) {
		return theme === 'light' ? assets.folderLight : assets.folder
	}

	const extension =
		file?.media?.extension?.toLowerCase() || file.name.split('.').pop()?.toLowerCase() || ''

	if (ARCHIVE_EXTENSION.test(extension) || EBOOK_EXTENSION.test(extension)) {
		return theme === 'light' ? assets.archiveLight : assets.archive
	} else if (PDF_EXTENSION.test(extension)) {
		return theme === 'light' ? assets.documentPdfLight : assets.documentPdf
	} else {
		return theme === 'light' ? assets.documentLight : assets.document
	}
}
