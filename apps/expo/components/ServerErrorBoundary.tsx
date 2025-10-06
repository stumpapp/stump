import { isNetworkError } from '@stump/sdk'
import { useRouter } from 'expo-router'
import { ServerCrash } from 'lucide-react-native'
import { View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import ServerConnectFailed from './ServerConnectFailed'
import { Button, Heading, Text } from './ui'
import { Icon } from './ui/icon'

type Props = {
	error: Error
	onRetry?: () => void
}

export default function ServerErrorBoundary({ error, onRetry }: Props) {
	const router = useRouter()

	if (isNetworkError(error)) {
		return <ServerConnectFailed onRetry={onRetry} />
	}

	return (
		<SafeAreaView className="flex-1 bg-background p-4">
			<View className="flex-1 gap-4">
				<Heading size="xl" className="text-center">
					Something went wrong!
				</Heading>

				<View className="relative flex flex-row justify-center">
					<View className="squircle flex items-center justify-center rounded-lg bg-background-surface p-2">
						<Icon as={ServerCrash} className="h-10 w-10 text-foreground-muted" />
					</View>
				</View>

				<Text size="lg" className="text-center">
					{error.message}
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
