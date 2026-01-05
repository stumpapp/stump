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
		<View className="flex-row items-center justify-between py-2">
			<Text className="text-lg">{label}</Text>
			<Host matchContents>
				<ColorPicker label="" selection={value} onValueChanged={onChange} supportsOpacity={false} />
			</Host>
		</View>
	)
}
