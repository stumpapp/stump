import { FlashList } from '@shopify/flash-list'
import { desc, eq } from 'drizzle-orm'
import { useLiveQuery } from 'drizzle-orm/expo-sqlite'
import { useRouter } from 'expo-router'
import { Pressable, View } from 'react-native'

import { Text } from '~/components/ui'
import { db, downloadedFiles, libraryRefs, seriesRefs, unsyncedReadProgress } from '~/db'

export default function Screen() {
	const { data } = useLiveQuery(
		db
			.select()
			.from(downloadedFiles)
			.leftJoin(unsyncedReadProgress, eq(downloadedFiles.id, unsyncedReadProgress.bookId))
			.leftJoin(seriesRefs, eq(downloadedFiles.seriesId, seriesRefs.id))
			.leftJoin(libraryRefs, eq(seriesRefs.libraryId, libraryRefs.id))
			.orderBy(
				desc(unsyncedReadProgress.lastModified),
				desc(downloadedFiles.downloadedAt),
				desc(libraryRefs.id),
			),
	)

	const router = useRouter()

	// console.log('Downloaded files with joins:', data)

	return (
		<FlashList
			data={data}
			renderItem={({ item }) => (
				<Pressable onPress={() => router.push(`/offline/${item.downloaded_files.id}/read`)}>
					{({ pressed }) => (
						<View className="text-foreground" style={{ opacity: pressed ? 0.7 : 1 }}>
							<Text>{item.downloaded_files.filename}</Text>
						</View>
					)}
				</Pressable>
			)}
			keyExtractor={(item) => item.downloaded_files.id}
			contentContainerStyle={{ padding: 16 }}
		/>
	)
}
