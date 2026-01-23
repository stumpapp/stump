import { isNetworkError, isOutdatedGraphQLSchemaError } from '@stump/sdk'
import { useRouter } from 'expo-router'
import { Linking, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import Owl from '../Owl'
import { Button, Heading, Text } from '../ui'
import PotentiallyOutdatedServer from './PotentiallyOutdatedServer'
import ServerConnectFailed from './ServerConnectFailed'
import { getIssueUrl } from './utils'

type Props = {
	error: Error
	onRetry?: () => void
}

export default function ServerErrorBoundary({ error, onRetry }: Props) {
	const router = useRouter()

	if (isNetworkError(error)) {
		return <ServerConnectFailed onRetry={onRetry} />
	}

	if (isOutdatedGraphQLSchemaError(error)) {
		return <PotentiallyOutdatedServer error={error} onRetry={onRetry} />
	}

	return (
		<SafeAreaView className="flex-1 items-center justify-center bg-background p-4">
			<View className="w-full flex-1 items-center justify-between gap-8">
				<View className="flex-1 items-center justify-center gap-8">
					<Owl owl="error" />

					<View className="gap-2 px-4 tablet:max-w-lg">
						<Heading size="xl" className="text-center">
							Something went wrong!
						</Heading>

						<Text size="lg" className="text-center">
							{error.message}
						</Text>
					</View>
				</View>

				<View className="w-full gap-3">
					<Button
						className="rounded-full"
						size="lg"
						variant="brand"
						onPress={() => router.dismissAll()}
					>
						<Text>Return Home</Text>
					</Button>

					<Button
						className="rounded-full"
						size="lg"
						variant="secondary"
						onPress={() => {
							const issueUrl = getIssueUrl(error)
							Linking.openURL(issueUrl)
						}}
					>
						<Text>Report Issue</Text>
					</Button>

					{onRetry && (
						<Button className="rounded-full" size="lg" variant="ghost" onPress={onRetry}>
							<Text>Try Again</Text>
						</Button>
					)}
				</View>
			</View>
		</SafeAreaView>
	)
}
