import { useRouter } from 'expo-router'
import { useMemo } from 'react'
import { Pressable, View } from 'react-native'

import { syncStatus } from '~/db'
import { formatBytesSeparate } from '~/lib/format'
import { useListItemSize } from '~/lib/hooks'

import { BorderAndShadow } from '../BorderAndShadow'
import { TurboImage } from '../Image'
import { Heading, Progress, Text } from '../ui'
import { SyncIcon } from './sync-icon/SyncIcon'
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

	const readProgress = useMemo(() => downloadedFile.readProgress, [downloadedFile])
	const status = syncStatus.safeParse(readProgress?.syncStatus).data

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

	const getProgress = () => {
		if (!readProgress) {
			return null
		}

		const currentPage = readProgress.page || 0
		const totalPages = downloadedFile.pages || -1
		if (totalPages > 0 && currentPage > 0) {
			return Math.min((currentPage / totalPages) * 100, 100)
		}

		// const percentage = readProgress.percentage
		// 	? (readProgress.percentage * 100).toFixed(2)
		// 	: 0
		return null
	}

	return (
		<Pressable onPress={() => router.push(`/offline/${downloadedFile.id}/read`)}>
			{({ pressed }) => (
				<View className="white relative flex-row gap-4" style={{ opacity: pressed ? 0.8 : 1 }}>
					<BorderAndShadow
						style={{ borderRadius: 8, borderWidth: 0.3, shadowRadius: 1.41, elevation: 2 }}
					>
						{/* TODO: Use file icons when no thumbnail is available */}
						<TurboImage
							source={{
								// @ts-expect-error: URI doesn't like undefined but it shows a placeholder when
								// undefined so it's fine
								uri: thumbnailPath,
							}}
							resizeMode="stretch"
							resize={width * 1.5}
							style={{ height: height / 2, width: width / 2 }}
						/>
					</BorderAndShadow>

					{/* <View>
						<Heading className="mt-2" numberOfLines={2}>
							{downloadedFile.bookName || 'Untitled'}
						</Heading>

						<View className="flex-1 gap-4">
							<Text className="text-foreground-muted">{renderSubtitle()}</Text>
							{readProgress && (
								<>
									<Progress
										className="mb-4 h-1 bg-background-surface-secondary"
										value={getProgress()}
										style={{ height: 6, borderRadius: 3 }}
									/>
								</>
							)}
						</View>
					</View>

					<View className="flex-1" />

					<View className="self-center">
						<SyncIcon isAttemptingSync={isAttemptingSync} isSynced={!readProgress} />
					</View> */}

					<View className="flex-1 justify-center py-2">
						<View className="flex flex-1 flex-row justify-between">
							<View>
								<Heading numberOfLines={2}>{downloadedFile.bookName || 'Untitled'}</Heading>
								<Text className="text-foreground-muted">{renderSubtitle()}</Text>
							</View>

							{status && (
								<View className="mt-1">
									<SyncIcon status={status} />
								</View>
							)}
						</View>

						{readProgress && (
							<>
								<Progress
									className="h-1 bg-background-surface-secondary"
									value={getProgress()}
									style={{ height: 6, borderRadius: 3 }}
								/>
							</>
						)}
					</View>
				</View>
			)}
		</Pressable>
	)
}
