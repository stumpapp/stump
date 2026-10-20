import { ScrollView, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { RangedStats, Streaks } from '~/components/readingStats'

export default function Screen() {
	return (
		<SafeAreaView className="flex-1 bg-background" edges={['left', 'right']}>
			<ScrollView contentInsetAdjustmentBehavior="automatic">
				<View className="gap-4 p-4">
					<Streaks />
					<RangedStats />
				</View>
			</ScrollView>
		</SafeAreaView>
	)
}
