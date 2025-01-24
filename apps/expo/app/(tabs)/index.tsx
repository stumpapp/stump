import { Link } from 'expo-router'
import { View } from 'react-native'

import { Text } from '~/components/ui/text'
import { useSavedServers } from '~/stores'

export default function Screen() {
	const { savedServers } = useSavedServers()

	if (!savedServers.length) {
		return (
			<View className="flex-1 items-center justify-center gap-5 bg-background p-4">
				<Link href="/server/1">
					<Text>Server 1</Text>
				</Link>
			</View>
		)

		return (
			<View className="flex-1 items-center justify-center gap-5 bg-background p-6">
				<Text>Add a server to get started</Text>
			</View>
		)
	}

	// TODO: render list of servers, separate by kind (but only Stump supported for now)
	// TODO: If selected server is unauthed, show login **sheet** which then navigates to the
	// appropriate stack
	return (
		<View className="flex-1 items-center justify-center gap-5 bg-background p-6">
			<Text>Server list</Text>
			<Link href="/server/1">
				<Text>Server 1</Text>
			</Link>
		</View>
	)
}
