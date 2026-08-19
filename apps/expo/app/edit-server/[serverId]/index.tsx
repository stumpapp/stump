import { useLocalSearchParams } from 'expo-router'
import { View } from 'react-native'

import { Text } from '~/components/ui'

export default function EditServerRoot() {
	const { serverId } = useLocalSearchParams<{ serverId: string }>()

	return (
		<View>
			<Text>{serverId}</Text>
		</View>
	)
}
