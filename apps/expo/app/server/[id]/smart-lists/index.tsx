import { SafeAreaView, View } from 'react-native'

import { Text } from '~/components/ui'

export default function Screen() {
	return (
		<SafeAreaView className="flex-1 bg-background">
			<View className="flex-1 gap-5 p-4">
				<Text className="text-3xl font-semibold">All smart lists</Text>
			</View>
		</SafeAreaView>
	)
}
