import { View } from 'react-native'
import { Text } from '~/components/ui'

export default function UnsupportedReader() {
	return (
		<View>
			<Text>The book reader for this format is not supported yet. Check back later!</Text>
		</View>
	)
}
