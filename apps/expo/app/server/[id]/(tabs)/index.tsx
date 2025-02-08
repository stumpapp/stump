import { ScrollView } from 'react-native-gesture-handler'

import { ContinueReading } from '~/components/activeServer/home'

export default function Screen() {
	return (
		<ScrollView className="flex-1 gap-5 bg-background p-4">
			<ContinueReading />
		</ScrollView>
	)
}
