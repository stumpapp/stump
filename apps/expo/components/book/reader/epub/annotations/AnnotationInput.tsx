import { TextInput, TextInputProps, View } from 'react-native'

import { Text } from '~/components/ui'
import { useColors } from '~/lib/constants'

export default function AnnotationInput({
	value,
	onChangeText,
}: Pick<TextInputProps, 'value' | 'onChangeText'>) {
	const colors = useColors()
	return (
		<View className="gap-2">
			<Text className="text-foreground-muted px-2">Note</Text>
			<TextInput
				value={value}
				onChangeText={onChangeText}
				placeholder="Enter your notes..."
				placeholderTextColor={colors.foreground.muted}
				selectionColor={colors.fill.brand.DEFAULT}
				multiline
				className="p-3 border-edge bg-black/5 dark:bg-white/10 squircle min-h-[80px] rounded-2xl text-foreground"
				textAlignVertical="top"
			/>
		</View>
	)
}
