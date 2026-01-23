import { useRouter } from 'expo-router'
import { Linking, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import Owl, { useOwlHeaderOffset } from '../Owl'
import { Button, Heading, Text } from '../ui'
import { getIssueUrl } from './utils'

type Props = {
	error: Error
	onRetry?: () => void
}

export default function PotentiallyOutdatedServer({ error, onRetry }: Props) {
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
						Outdated Server
					</Heading>

					<Text size="lg" className="text-center">
						An error was returned that suggests your server is outdated. Please make sure your
						server is updated to continue.
					</Text>
				</View>

				<View className="flex-1" />

				<View className="w-full gap-3">
					<Button variant="brand" size="lg" roundness="full" onPress={() => router.dismissAll()}>
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
						<Button variant="ghost" size="lg" roundness="full" className="ml-2" onPress={onRetry}>
							<Text>Try Again</Text>
						</Button>
					)}
				</View>
			</View>
		</SafeAreaView>
	)
}
