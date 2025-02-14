import { useContinueReading, useSDK } from '@stump/client'
import { Image } from 'expo-image'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { Fragment, useMemo } from 'react'
import { FlatList, Pressable, View } from 'react-native'

import { BookListItem } from '~/components/book'
import { Heading, Progress, Text } from '~/components/ui'
import { getBookProgression } from '~/lib/sdk'

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
		() => (activeBook ? getBookProgression(activeBook) : null),
		[activeBook],
	)

	const leftOffBooks = useMemo(() => media.slice(1), [media])

	return (
		<Fragment>
			{activeBook && (
				<View className="flex items-start gap-4">
					<Heading size="lg">Reading Now</Heading>

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
				<Heading size="lg">Continue Reading</Heading>

				<FlatList
					data={leftOffBooks}
					keyExtractor={({ id }) => id}
					renderItem={({ item: book }) => <BookListItem book={book} />}
					horizontal
					pagingEnabled
					initialNumToRender={10}
					maxToRenderPerBatch={10}
					showsHorizontalScrollIndicator={false}
				/>
			</View>
		</Fragment>
	)
}
