import { useMediaByIdQuery, useSDK } from '@stump/client'
import { Image } from 'expo-image'
import { useGlobalSearchParams, useLocalSearchParams, useRouter } from 'expo-router'
import { View } from 'react-native'
import { Pressable, ScrollView } from 'react-native-gesture-handler'
import { useActiveServer } from '~/components/activeServer'
import { Button, Text } from '~/components/ui'

export default function Screen() {
	const { id: bookID } = useLocalSearchParams<{ id: string }>()
	const {
		activeServer: { id },
	} = useActiveServer()
	const { sdk } = useSDK()
	const { media } = useMediaByIdQuery(bookID, { suspense: true })

	const router = useRouter()

	if (!media) return null

	return (
		<ScrollView className="flex-1 gap-5 bg-background px-3 py-10">
			<View className="flex flex-1 items-start gap-8 pb-6">
				<View className="flex items-start gap-4">
					<Text className="text-2xl font-bold leading-6">
						{media.metadata?.title || media.name}
					</Text>

					<View className="aspect-[2/3] overflow-hidden rounded-lg">
						<Image
							source={{
								uri: sdk.media.thumbnailURL(media.id),
								headers: {
									Authorization: `Bearer ${sdk.token}`,
								},
							}}
							contentFit="fill"
							style={{ height: 450, width: 'auto' }}
						/>
					</View>
				</View>

				<Button onPress={() => router.navigate(`/server/${id}/books/${media.id}/read`)}>
					<Text>{media.active_reading_session ? 'Continue reading' : 'Read'}</Text>
				</Button>
			</View>
		</ScrollView>
	)
}
