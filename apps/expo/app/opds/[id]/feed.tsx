import { useQuery, useSDK } from '@stump/client'
import { useLocalSearchParams } from 'expo-router'
import { SafeAreaView, View } from 'react-native'
import { ScrollView } from 'react-native-gesture-handler'

import { Heading, Text } from '~/components/ui'

export default function Screen() {
	const { url: feedURL } = useLocalSearchParams<{ url: string }>()
	const { sdk } = useSDK()

	const { data: feed } = useQuery([sdk.opds.keys.feed, feedURL], () => sdk.opds.feed(feedURL), {
		suspense: true,
	})

	if (!feed) return null

	const title = feed.metadata.title || 'OPDS Feed'

	return (
		<SafeAreaView className="flex-1 bg-background">
			<ScrollView className="flex-1 gap-5 bg-background px-6">
				<View className="flex-1 gap-8">
					<View className="flex items-start gap-4">
						<Heading size="lg" className="mt-6 leading-6">
							{title}
						</Heading>
					</View>

					<View className="flex w-full flex-row items-center gap-2 tablet:max-w-sm tablet:self-center">
						<Text>TODO: implement dynamic feed route</Text>
					</View>
				</View>
			</ScrollView>
		</SafeAreaView>
	)
}
