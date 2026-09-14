import { ColorPicker, Host } from '@expo/ui/swift-ui'
import { View } from 'react-native'

import { Text } from '~/components/ui'

type Props = {
	label: string
	value: string
	onChange: (color: string) => void
}

export function ColorPickerRow({ label, value, onChange }: Props) {
	return (
		<View className="py-2 flex-row items-center justify-between">
			<Text className="text-lg">{label}</Text>
			<Host matchContents>
				<ColorPicker
					// Note: key was necessary to get the color to respond when externally changed (e.g., picking a premade theme)
					key={value}
					label=""
					selection={value}
					onSelectionChange={onChange}
					supportsOpacity={false}
				/>
			</Host>
		</View>
	)
}
