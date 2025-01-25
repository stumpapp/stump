import { View } from 'react-native'

import { Text } from '~/components/ui/text'

export default function Screen() {
	return (
		<View className="flex-1 items-center justify-center gap-5 bg-background p-6">
			<Text>Screen content</Text>
		</View>
	)
}
