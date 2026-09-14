import { View } from 'react-native'

import { Text } from '~/components/ui'

export default function AnnotatedText({ text }: { text: string }) {
	return (
		<View className="gap-0.5 bg-black/10 dark:bg-white/10 squircle flex-row rounded-2xl">
			<View className="bg-accent-400 dark:bg-accent-500 w-1.5 h-full" />
			<Text className="p-3 flex-1">{text}</Text>
		</View>
	)
}
