import { useRouter } from 'expo-router'
import { Linking, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { useTranslate } from '~/lib/hooks/useTranslate'

import Owl, { useOwlHeaderOffset } from '../Owl'
import { Button, Heading, Text } from '../ui'
import { getIssueUrl } from './utils'

type Props = {
	error: Error
	onRetry?: () => void
}

export default function ServerCompatibilityIssue({ error, onRetry }: Props) {
	const router = useRouter()
	const emptyContainerStyle = useOwlHeaderOffset()

	const { translate } = useTranslate()

	const message = error.message ?? translate('shared.errors.serverCompatibility.fallbackMessage')

	return (
		<SafeAreaView className="flex-1 bg-background">
			<View
				className="gap-8 p-4 h-full flex-1 items-center justify-center"
				style={emptyContainerStyle}
			>
				<Owl owl="network-error" />

				<View className="gap-2 px-4 tablet:max-w-lg">
					<Heading size="xl" className="font-semibold leading-tight text-center">
						{translate('shared.errors.serverCompatibility.heading')}
					</Heading>

					<Text size="lg" className="text-center">
						{message}
					</Text>
				</View>

				<View className="flex-1" />

				<View className="gap-3 w-full">
					<Button variant="brand" size="lg" roundness="full" onPress={() => router.dismissAll()}>
						<Text>{translate('shared.common.returnHome')}</Text>
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
						<Text>{translate('shared.errors.reportIssue')}</Text>
					</Button>

					{onRetry && (
						<Button variant="ghost" size="lg" roundness="full" className="ml-2" onPress={onRetry}>
							<Text>{translate('shared.common.tryAgain')}</Text>
						</Button>
					)}
				</View>
			</View>
		</SafeAreaView>
	)
}
