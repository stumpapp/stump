import { View } from 'react-native'
import LinearGradient from 'react-native-linear-gradient'
import { SafeAreaView } from 'react-native-safe-area-context'

import { Heading, Text } from '../ui'

type Props = {
	name: string
	description?: string | null
	gradientColors?: string[]
}

// TODO(smart-lists): make pretty _and_ functional and then consider using or remove

export default function SmartListHeader({ name, description, gradientColors }: Props) {
	return (
		<View className="relative mb-4">
			{gradientColors && (
				<LinearGradient
					colors={gradientColors}
					useAngle
					angle={135}
					style={{ position: 'absolute', inset: 0 }}
				/>
			)}
			<SafeAreaView>
				<View className="gap-2 p-4">
					<Heading size="2xl">{name}</Heading>
					<Text>{description}</Text>
				</View>
			</SafeAreaView>
		</View>
	)
}
