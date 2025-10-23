import { useRouter } from 'expo-router'
import { useMemo } from 'react'
import { Pressable, View } from 'react-native'

import { formatBytesSeparate } from '~/lib/format'
import { useListItemSize } from '~/lib/hooks'

import { BorderAndShadow } from '../BorderAndShadow'
import { TurboImage } from '../Image'
import { Heading, Text } from '../ui'
import { DownloadedFile } from './types'
import { getThumbnailPath } from './utils'

type Props = {
	downloadedFile: DownloadedFile
}

// TODO: Consider altering useListITemSize to accept size variants (e.g., small, medium, large)
// Or just diff hook
export default function DownloadRowItem({ downloadedFile }: Props) {
	const router = useRouter()

	const thumbnailPath = useMemo(() => getThumbnailPath(downloadedFile), [downloadedFile])

	const { width, height } = useListItemSize()

	const renderSubtitle = () => {
		const parts = []

		if (downloadedFile.size != null) {
			const size = formatBytesSeparate(downloadedFile.size)
			if (size) {
				parts.push(`${size.value} ${size.unit}`)
			}
		}

		if (downloadedFile.pages != null && downloadedFile.pages > 0) {
			parts.push(`${downloadedFile.pages} pages`)
		}

		return parts.join(' • ')
	}

	return (
		<Pressable onPress={() => router.push(`/offline/${downloadedFile.id}/read`)}>
			{({ pressed }) => (
				<View className="white relative flex-row gap-4" style={{ opacity: pressed ? 0.8 : 1 }}>
					<BorderAndShadow
						style={{ borderRadius: 8, borderWidth: 0.3, shadowRadius: 1.41, elevation: 2 }}
					>
						<TurboImage
							source={{
								uri: thumbnailPath,
							}}
							resizeMode="stretch"
							resize={width * 1.5}
							style={{ height: height / 2, width: width / 2 }}
						/>
					</BorderAndShadow>

					<View>
						<Heading className="mt-2" numberOfLines={2}>
							{downloadedFile.bookName || 'Untitled'}
						</Heading>

						<View>
							<Text className="text-foreground-muted">{renderSubtitle()}</Text>
						</View>
					</View>
				</View>
			)}
		</Pressable>
	)
}
