import { ScrollView } from 'react-native-gesture-handler'

import { ContinueReading } from '~/components/activeServer/home'

export default function Screen() {
	return (
		<ScrollView className="g-background flex-1 gap-5 p-4">
			<ContinueReading />
		</ScrollView>
	)
}
