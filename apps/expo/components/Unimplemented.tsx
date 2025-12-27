import { useRouter } from 'expo-router'
import { View } from 'react-native'

import Owl, { useOwlHeaderOffset } from './Owl'
import { Button, Heading, Text } from './ui'

const DEFAULT_TEXT = 'This feature is not yet implemented. Please check back later!'

type Props = {
	message?: string
}

export default function Unimplemented({ message = DEFAULT_TEXT }: Props) {
	const emptyContainerStyle = useOwlHeaderOffset()
	const router = useRouter()

	return (
		<View
			className="h-full flex-1 items-center justify-center gap-8 p-4"
			style={emptyContainerStyle}
		>
			<Owl owl="construction" />

			<View className="gap-2 px-4 tablet:max-w-lg">
				<Heading size="xl" className="text-center font-semibold leading-tight">
					Coming Soon!
				</Heading>

				<Text size="lg" className="text-center">
					{message}
				</Text>
			</View>

			<View className="w-full gap-3">
				<Button variant="secondary" size="lg" roundness="full" onPress={() => router.back()}>
					<Text>Okay</Text>
				</Button>
			</View>
		</View>
	)
}
