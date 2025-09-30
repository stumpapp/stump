/* eslint-disable @typescript-eslint/no-require-imports */
import { ARCHIVE_EXTENSION, EBOOK_EXTENSION, PDF_EXTENSION, useSDK } from '@stump/client'
import { DirectoryListingQuery } from '@stump/graphql'
import { useRouter } from 'expo-router'
import { useCallback } from 'react'
import { Image, Pressable, View } from 'react-native'

import { useColorScheme } from '~/lib/useColorScheme'
import { usePreferencesStore } from '~/stores'

import { useActiveServer } from '../activeServer'
import { BorderAndShadow } from '../BorderAndShadow'
import { TurboImage } from '../Image'
import { Text } from '../ui'

type ListedFile = DirectoryListingQuery['listDirectory']['nodes'][number]['files'][number]

type Props = {
	file: ListedFile
}

export default function FileExplorerGridItem({ file }: Props) {
	const { colorScheme } = useColorScheme()
	const iconSource = getIconSource(file, colorScheme)
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
					{!file.media && (
						<TurboImage
							source={{ uri: Image.resolveAssetSource(iconSource).uri }}
							style={{ width: 100, height: 100 }}
							resize={100 * 1.5}
						/>
					)}
					{!!file.media?.thumbnail.url && (
						<BorderAndShadow
							style={{ borderRadius: 4, borderWidth: 0.3, shadowRadius: 1.41, elevation: 2 }}
						>
							<TurboImage
								source={{
									uri: file.media.thumbnail.url,
									headers: {
										...sdk.customHeaders,
										Authorization: sdk.authorizationHeader || '',
									},
								}}
								resizeMode="stretch"
								resize={70 * 1.5}
								style={{ height: 70 / thumbnailRatio, width: 70 }}
							/>
						</BorderAndShadow>
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

const getIconSource = (file: ListedFile, theme: 'light' | 'dark') => {
	if (file.isDirectory) {
		return theme === 'light' ? ICON_PATHS.folderLight : ICON_PATHS.folder
	}

	const extension =
		file?.media?.extension?.toLowerCase() || file.name.split('.').pop()?.toLowerCase() || ''

	if (ARCHIVE_EXTENSION.test(extension) || EBOOK_EXTENSION.test(extension)) {
		return theme === 'light' ? ICON_PATHS.archiveLight : ICON_PATHS.archive
	} else if (PDF_EXTENSION.test(extension)) {
		return theme === 'light' ? ICON_PATHS.documentPdfLight : ICON_PATHS.documentPdf
	} else {
		return theme === 'light' ? ICON_PATHS.documentLight : ICON_PATHS.document
	}
}

const ICON_PATHS = {
	folder: require('../../assets/icons/Folder.png'),
	folderLight: require('../../assets/icons/Folder_Light.png'),
	document: require('../../assets/icons/Document.png'),
	documentLight: require('../../assets/icons/Document_Light.png'),
	archive: require('../../assets/icons/Archive.png'),
	archiveLight: require('../../assets/icons/Archive_Light.png'),
	documentPdf: require('../../assets/icons/Document_pdf.png'),
	documentPdfLight: require('../../assets/icons/Document_pdf_Light.png'),
}
