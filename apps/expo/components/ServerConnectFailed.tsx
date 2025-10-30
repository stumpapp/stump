import { useRouter } from 'expo-router'
import { WifiOff } from 'lucide-react-native'
import { View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { Button, Heading, Icon, Text } from './ui'

type Props = {
	onRetry?: () => void
}

export default function ServerConnectFailed({ onRetry }: Props) {
	const router = useRouter()

	return (
		<SafeAreaView className="flex-1 bg-background p-4">
			<View className="flex-1 gap-4">
				<Heading size="xl" className="text-center">
					Failed to Connect
				</Heading>

				<View className="relative flex flex-row justify-center">
					<View className="squircle flex items-center justify-center rounded-lg bg-background-surface p-2">
						<Icon as={WifiOff} className="h-10 w-10 text-foreground-muted" />
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

					{onRetry && (
						<Button variant="secondary" className="ml-2" onPress={onRetry}>
							<Text>Try Again</Text>
						</Button>
					)}
				</View>
			</View>
		</SafeAreaView>
	)
}
