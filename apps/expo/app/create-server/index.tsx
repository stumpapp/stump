import { SafeAreaView, View } from 'react-native'
import { Link } from 'expo-router'

import { Text } from '~/components/ui'

export default function CreateServerRoot() {
	return (
		<SafeAreaView>
			<Link href="/create-server/network-settings">
				<Text>Go to network</Text>
			</Link>
		</SafeAreaView>
	)
}
