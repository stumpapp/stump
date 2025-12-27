import { View } from 'react-native'
import LinearGradient from 'react-native-linear-gradient'

import { Input } from '~/components/ui'
import { useColors } from '~/lib/constants'

type Props = {
	placeholder: string
	value: string
	onChangeText: (text: string) => void
}

export default function FilterSheetSearchHeader({ placeholder, value, onChangeText }: Props) {
	const colors = useColors()

	return (
		<View className="relative">
			<LinearGradient
				colors={[colors.background.DEFAULT, colors.background.DEFAULT, 'transparent']}
				locations={[0, 0.7, 1]}
				style={{
					position: 'absolute',
					top: 0,
					left: 0,
					right: 0,
					bottom: -16,
					zIndex: 0,
				}}
				pointerEvents="none"
			/>
			<View style={{ zIndex: 1 }} className="px-4 pb-4 pt-4">
				<Input
					placeholder={placeholder}
					value={value}
					onChangeText={onChangeText}
					className="rounded-full"
				/>
			</View>
		</View>
	)
}
