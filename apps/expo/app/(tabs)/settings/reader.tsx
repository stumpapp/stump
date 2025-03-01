import { View } from 'react-native'
import { ScrollView } from 'react-native-gesture-handler'
import { SafeAreaView } from 'react-native-safe-area-context'

import { ReaderSettings } from '~/components/book/reader/settings'
import { Heading, Text } from '~/components/ui'

export default function Screen() {
	return (
		<SafeAreaView className="flex-1 bg-background">
			<ScrollView className="flex-1 bg-background p-4">
				<View className="flex-1 gap-8">
					<View className="gap-1.5">
						<Heading size="lg">Global Reader Settings</Heading>
						<Text className="text-foreground-muted">
							Books will default to these settings, but you may override any while reading
						</Text>
					</View>

					<ReaderSettings />
				</View>
			</ScrollView>
		</SafeAreaView>
	)
}
