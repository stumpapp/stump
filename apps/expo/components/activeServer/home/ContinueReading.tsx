import { useContinueReading, useSDK } from '@stump/client'
import type { Media } from '@stump/sdk'
import { Image } from 'expo-image'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useMemo } from 'react'
import { FlatList, Pressable, View } from 'react-native'

import { Progress, Text } from '~/components/ui'

export default function ContinueReading() {
	const { sdk } = useSDK()
	const { media } = useContinueReading({
		limit: 20,
		suspense: true,
	})
	const { id: serverID } = useLocalSearchParams<{ id: string }>()

	const router = useRouter()

	const activeBook = useMemo(() => media.at(0), [media])
	const activeBookProgress = useMemo(
		() => (activeBook ? bookProgress(activeBook) : null),
		[activeBook],
	)

	const leftOffBooks = useMemo(() => media.slice(1), [media])

	return (
		<View className="flex flex-1 gap-8 pb-6">
			{activeBook && (
				<View className="flex items-start gap-4">
					<Text className="text-2xl font-bold leading-6">Reading Now</Text>

					<Pressable
						className="relative aspect-[2/3] overflow-hidden rounded-lg"
						onPress={() => router.navigate(`/server/${serverID}/books/${activeBook.id}`)}
					>
						<View className="absolute inset-0 z-10 bg-black" style={{ opacity: 0.5 }} />
						<Image
							className="z-0"
							source={{
								uri: sdk.media.thumbnailURL(activeBook.id),
								headers: {
									Authorization: `Bearer ${sdk.token}`,
								},
							}}
							contentFit="fill"
							style={{ height: 400, width: 'auto' }}
						/>

						<View className="absolute bottom-0 z-20 gap-2 p-2">
							<Text
								className="text-2xl font-bold leading-8 text-white"
								style={{
									textShadowOffset: { width: 2, height: 1 },
									textShadowRadius: 2,
									textShadowColor: 'rgba(0, 0, 0, 0.5)',
								}}
							>
								{activeBook.metadata?.title || activeBook.name}
							</Text>

							{activeBookProgress && <Progress className="h-1" value={activeBookProgress} />}
						</View>
					</Pressable>
				</View>
			)}

			<View className="flex gap-4">
				<Text className="text-2xl font-bold leading-6">Continue Reading</Text>

				{/* FIXME: flex-row not working */}
				<FlatList
					data={leftOffBooks}
					keyExtractor={({ id }) => id}
					renderItem={({ item: book }) => (
						<View key={book.id} className="flex items-start px-1">
							<View className="relative aspect-[2/3] overflow-hidden rounded-lg">
								<View className="absolute inset-0 z-10 bg-black" style={{ opacity: 0.35 }} />
								<Image
									className="z-0"
									source={{
										uri: sdk.media.thumbnailURL(book.id),
										headers: {
											Authorization: `Bearer ${sdk.token}`,
										},
									}}
									contentFit="fill"
									style={{ height: 150, width: 'auto' }}
								/>
							</View>

							{/* <View className=" z-20 gap-2 p-2">
								<Text className="text-2xl font-bold leading-8">
									{book.metadata?.title || book.name}
								</Text>
							</View> */}
						</View>
					)}
					horizontal
					pagingEnabled
					initialNumToRender={10}
					maxToRenderPerBatch={10}
				/>
			</View>
		</View>
	)
}

const bookProgress = ({ active_reading_session, finished_reading_sessions, pages }: Media) => {
	if (!active_reading_session && !finished_reading_sessions) {
		return null
	} else if (active_reading_session) {
		const { epubcfi, percentage_completed, page } = active_reading_session

		if (epubcfi && percentage_completed) {
			return Math.round(percentage_completed * 100)
		} else if (page) {
			const percent = Math.round((page / pages) * 100)
			return Math.min(Math.max(percent, 0), 100) // Clamp between 0 and 100
		}
	} else if (finished_reading_sessions?.length) {
		return 100
	}

	return null
}
