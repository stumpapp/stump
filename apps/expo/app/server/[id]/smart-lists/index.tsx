import { View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { Text } from '~/components/ui'
import Unimplemented from '~/components/Unimplemented'

export default function Screen() {
	return (
		<SafeAreaView className="flex-1 bg-background">
			<Unimplemented />
		</SafeAreaView>
	)

	return (
		<SafeAreaView className="flex-1 bg-background">
			<View className="flex-1 gap-5 p-4">
				<Text className="text-3xl font-semibold">All smart lists</Text>
			</View>
		</SafeAreaView>
	)
}
