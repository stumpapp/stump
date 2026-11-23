import {
	isNetworkError,
	isOutdatedGraphQLSchemaError,
	isServerCompatibilityError,
} from '@stump/sdk'
import { useRouter } from 'expo-router'
import { Linking, ScrollView, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { useTranslate } from '~/lib/hooks'

import Owl from '../Owl'
import { Button, Heading, Text } from '../ui'
import ServerCompatibilityIssue from './ServerCompatibilityIssue'
import ServerConnectFailed from './ServerConnectFailed'
import { getIssueUrl } from './utils'

type Props = {
	error: Error
	onRetry?: () => void
}

export default function ServerErrorBoundary({ error, onRetry }: Props) {
	const router = useRouter()
	const { translate } = useTranslate()

	if (isNetworkError(error)) {
		return <ServerConnectFailed onRetry={onRetry} />
	}

	if (isOutdatedGraphQLSchemaError(error) || isServerCompatibilityError(error)) {
		return <ServerCompatibilityIssue error={error} onRetry={onRetry} />
	}

	return (
		<SafeAreaView className="p-4 flex-1 items-center justify-center bg-background">
			<View className="gap-8 w-full flex-1 items-center justify-between">
				<View className="gap-8 flex-1 items-center justify-center">
					<Owl owl="error" />

					<View className="gap-2 px-4 tablet:max-w-lg">
						<Heading size="xl" className="text-center">
							{translate('shared.common.somethingWentWrong')}
						</Heading>

						<ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 200 }}>
							<Text size="lg" className="text-center">
								{error.message}
							</Text>
						</ScrollView>
					</View>
				</View>

				<View className="gap-3 w-full">
					<Button
						className="rounded-full"
						size="lg"
						variant="brand"
						onPress={() => router.dismissAll()}
					>
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
						<Button className="rounded-full" size="lg" variant="ghost" onPress={onRetry}>
							<Text>{translate('shared.common.tryAgain')}</Text>
						</Button>
					)}
				</View>
			</View>
		</SafeAreaView>
	)
}
