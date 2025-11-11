import { View } from 'react-native'

import Owl from '../Owl'
import { Heading, Text } from '../ui'

export default function NoDownloadsOnDevice() {
	return (
		<View className="h-full flex-1 items-center justify-center gap-6 p-4">
			<Owl owl="empty" />

			<View className="gap-2 px-4 tablet:max-w-lg">
				<Heading size="lg" className="text-center font-semibold leading-tight">
					Nothing to read yet
				</Heading>
				<Text className="text-center text-lg">
					Once you download books for offline reading, they will appear here
				</Text>
			</View>
		</View>
	)
}
