import { useRouter } from 'expo-router'
import { View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { useTranslate } from '~/lib/hooks'

import Owl, { useOwlHeaderOffset } from '../Owl'
import { Button, Heading, Text } from '../ui'

type Props = {
	onRetry?: () => void
}

export default function ServerConnectFailed({ onRetry }: Props) {
	const { t } = useTranslate()
	const router = useRouter()
	const emptyContainerStyle = useOwlHeaderOffset()

	return (
		<SafeAreaView className="flex-1 bg-background">
			<View
				className="gap-8 p-4 h-full flex-1 items-center justify-center"
				style={emptyContainerStyle}
			>
				<Owl owl="network-error" />

				<View className="gap-2 px-4 tablet:max-w-lg">
					<Heading size="xl" className="font-semibold leading-tight text-center">
						{t('errors.connectionFailed')}
					</Heading>

					<Text size="lg" className="text-center">
						{t('errors.connectionFailedDescription')}
					</Text>
				</View>

				<View className="flex-1" />

				<View className="gap-3 w-full">
					<Button variant="brand" size="lg" roundness="full" onPress={() => router.dismissAll()}>
						<Text>{t('errors.returnHome')}</Text>
					</Button>

					{onRetry && (
						<Button
							variant="secondary"
							size="lg"
							roundness="full"
							className="ml-2"
							onPress={onRetry}
						>
							<Text>{t('errors.tryAgain')}</Text>
						</Button>
					)}
				</View>
			</View>
		</SafeAreaView>
	)
}
