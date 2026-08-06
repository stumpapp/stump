import { useRouter } from 'expo-router'
import { View } from 'react-native'

import { useTranslate } from '~/lib/hooks'

import Owl, { useOwlHeaderOffset } from './Owl'
import { Button, Heading, Text } from './ui'

type Props = {
	message?: string
}

export default function Unimplemented({ message }: Props) {
	const { t } = useTranslate()
	const emptyContainerStyle = useOwlHeaderOffset()
	const router = useRouter()

	return (
		<View
			className="gap-8 p-4 h-full flex-1 items-center justify-center"
			style={emptyContainerStyle}
		>
			<Owl owl="construction" />

			<View className="gap-2 px-4 tablet:max-w-lg">
				<Heading size="xl" className="font-semibold leading-tight text-center">
					{t('unimplemented.title')}
				</Heading>

				<Text size="lg" className="text-center">
					{message ?? t('unimplemented.description')}
				</Text>
			</View>

			<View className="gap-3 w-full">
				<Button variant="secondary" size="lg" roundness="full" onPress={() => router.back()}>
					<Text>{t('unimplemented.okay')}</Text>
				</Button>
			</View>
		</View>
	)
}
