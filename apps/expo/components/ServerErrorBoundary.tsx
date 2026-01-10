import { isNetworkError } from '@stump/sdk'
import { useRouter } from 'expo-router'
import { Linking, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import Owl from './Owl'
import ServerConnectFailed from './ServerConnectFailed'
import { Button, Heading, Text } from './ui'

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

const getIssueUrl = (error: Error) => {
	const labels = ['bug', 'mobile-app']

	const errorTitle = '[BUG] Mobile App Error'

	let errorDetails = '## Error Details\n\n'
	errorDetails += `**Error Type:** ${error.constructor.name}\n\n`
	errorDetails += `**Message:** ${error.message}\n\n`

	if (error.stack) {
		errorDetails += `**Stack Trace:**\n\`\`\`\n${error.stack}\n\`\`\`\n\n`
	}

	if (error.cause) {
		errorDetails += `**Cause:**\n\`\`\`\n${typeof error.cause === 'string' ? error.cause : JSON.stringify(error.cause, null, 2)}\n\`\`\`\n\n`
	}

	const params = new URLSearchParams({
		title: errorTitle,
		labels: labels.join(','),
		body: errorDetails,
	})

	return `https://github.com/stumpapp/stump/issues/new?${params.toString()}`
}
