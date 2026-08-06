import { isNetworkError, isOutdatedGraphQLSchemaError } from '@stump/sdk'
import { useRouter } from 'expo-router'
import { Linking, ScrollView, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { useTranslate } from '~/lib/hooks'

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
	const { t } = useTranslate()
	const router = useRouter()

	if (isNetworkError(error)) {
		return <ServerConnectFailed onRetry={onRetry} />
	}

	if (isOutdatedGraphQLSchemaError(error)) {
		return <PotentiallyOutdatedServer error={error} onRetry={onRetry} />
	}

	return (
		<SafeAreaView className="p-4 flex-1 items-center justify-center bg-background">
			<View className="gap-8 w-full flex-1 items-center justify-between">
				<View className="gap-8 flex-1 items-center justify-center">
					<Owl owl="error" />

					<View className="gap-2 px-4 tablet:max-w-lg">
						<Heading size="xl" className="text-center">
							{t('errors.somethingWentWrong')}
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
						<Text>{t('errors.returnHome')}</Text>
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
						<Text>{t('errors.reportIssue')}</Text>
					</Button>

					{onRetry && (
						<Button className="rounded-full" size="lg" variant="ghost" onPress={onRetry}>
							<Text>{t('errors.tryAgain')}</Text>
						</Button>
					)}
				</View>
			</View>
		</SafeAreaView>
	)
}
