import { useRouter } from 'expo-router'
import { View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import Owl, { useOwlHeaderOffset } from './Owl'
import { Button, Heading, Text } from './ui'

type Props = {
	onRetry?: () => void
}

export default function ServerConnectFailed({ onRetry }: Props) {
	const router = useRouter()
	const emptyContainerStyle = useOwlHeaderOffset()

	return (
		<SafeAreaView className="flex-1 bg-background">
			<View
				className="h-full flex-1 items-center justify-center gap-8 p-4"
				style={emptyContainerStyle}
			>
				<Owl owl="network-error" />

				<View className="gap-2 px-4 tablet:max-w-lg">
					<Heading size="xl" className="text-center font-semibold leading-tight">
						Failed to Connect
					</Heading>

					<Text size="lg" className="text-center">
						A network error suggests this server is currently unavailable. Please ensure that it is
						running and accessible from this device
					</Text>
				</View>

				<View className="flex-1" />

				<View className="w-full gap-3">
					<Button variant="brand" size="lg" roundness="full" onPress={() => router.dismissAll()}>
						<Text>Return Home</Text>
					</Button>

					{onRetry && (
						<Button
							variant="secondary"
							size="lg"
							roundness="full"
							className="ml-2"
							onPress={onRetry}
						>
							<Text>Try Again</Text>
						</Button>
					)}
				</View>
			</View>
		</SafeAreaView>
	)
}
