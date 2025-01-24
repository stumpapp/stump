import { View } from 'react-native'
import { ScrollView } from 'react-native-gesture-handler'

import { ContinueReading } from '~/components/activeServer/home'

export default function Screen() {
	return (
		<ScrollView
			className="flex-1 gap-5 overflow-scroll bg-background p-6"
			contentContainerStyle={{ alignItems: 'flex-start', justifyContent: 'start' }}
		>
			<ContinueReading />
		</ScrollView>
	)
}
