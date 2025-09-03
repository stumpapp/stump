import { Suspense } from 'react'
import { View } from 'react-native'
import { ScrollView } from 'react-native-gesture-handler'

import Genres from './Genres'
import ReadStatus from './ReadStatus'
import Sort from './Sort'

export default function BookFilterHeader() {
	return (
		<View className="h-12">
			<ScrollView
				showsHorizontalScrollIndicator={false}
				showsVerticalScrollIndicator={false}
				horizontal
			>
				<Sort />

				<View className="w-2" />

				<Suspense>
					<Genres />
				</Suspense>

				<View className="w-2" />
				<ReadStatus />
			</ScrollView>
		</View>
	)
}
