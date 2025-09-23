import { useRouter } from 'expo-router'
import { View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { Button, Heading, icons, Text } from './ui'

const { WifiOff } = icons

export default function ServerConnectFailed() {
	const router = useRouter()

	return (
		<SafeAreaView className="flex-1 bg-background p-4">
			<View className="flex-1 gap-4">
				<Heading size="xl" className="text-center">
					Failed to Connect
				</Heading>

				<View className="relative flex flex-row justify-center">
					<View className="squircle flex items-center justify-center rounded-lg bg-background-surface p-2">
						<WifiOff className="h-10 w-10 text-foreground-muted" />
					</View>
				</View>

				<Text size="lg" className="text-center">
					A network error suggests this server is currently unavailable. Please ensure that it is
					running and accessible from this device
				</Text>

				<View />

				<View className="flex-row justify-center">
					<Button variant="brand" onPress={() => router.dismissAll()}>
						<Text>Return Home</Text>
					</Button>
				</View>
			</View>
		</SafeAreaView>
	)
}
