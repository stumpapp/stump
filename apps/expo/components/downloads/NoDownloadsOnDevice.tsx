import { ListX } from 'lucide-react-native'
import { View } from 'react-native'

import { Text } from '../ui'
import { Icon } from '../ui/icon'

export default function NoDownloadsOnDevice() {
	return (
		<View className="h-full flex-1 items-center justify-center gap-6 p-4">
			{/*TODO: Image or something */}

			<Icon as={ListX} size={32} className="text-muted-foreground" />

			<Text className="text-center text-lg">
				When you download books for offline reading, come back here to access them
			</Text>
		</View>
	)
}
