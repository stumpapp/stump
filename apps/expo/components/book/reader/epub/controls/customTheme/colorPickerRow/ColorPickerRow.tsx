import { TrueSheet } from '@lodev09/react-native-true-sheet'
import { useRef, useState } from 'react'
import { Pressable, View } from 'react-native'
import ColorPicker, { HueSlider, Panel1 } from 'reanimated-color-picker'

import { Button, Text } from '~/components/ui'
import { useColors } from '~/lib/constants'
import { useColorScheme } from '~/lib/useColorScheme'

type Props = {
	label: string
	value: string
	onChange: (color: string) => void
}

export function ColorPickerRow({ label, value, onChange }: Props) {
	const sheetRef = useRef<TrueSheet>(null)
	const [tempColor, setTempColor] = useState(value)
	const { colorScheme } = useColorScheme()
	const colors = useColors()

	const openPicker = () => {
		setTempColor(value)
		sheetRef.current?.present()
	}

	const handleConfirm = () => {
		onChange(tempColor)
		sheetRef.current?.dismiss()
	}

	const handleCancel = () => {
		sheetRef.current?.dismiss()
	}

	return (
		<>
			<View className="flex-row items-center justify-between py-2">
				<Text className="text-lg">{label}</Text>
				<Pressable onPress={openPicker}>
					<View
						className="h-8 w-8 rounded-full border-2 border-edge"
						style={{ backgroundColor: value }}
					/>
				</Pressable>
			</View>

			<TrueSheet
				ref={sheetRef}
				detents={[0.5]}
				cornerRadius={24}
				grabber
				// Note: Complex and conflicting gesture handling if not disabled,
				// I tried a nested gesture handler but a bit yucky. For now Android can
				// just tap the buttons to dismiss
				dismissible={false}
				backgroundColor={colors.background.DEFAULT}
				grabberOptions={{
					color: colorScheme === 'dark' ? '#333' : '#ccc',
				}}
			>
				<View className="gap-4 p-4 pb-8">
					<Text className="text-center text-lg font-medium">{label}</Text>

					<ColorPicker value={tempColor} onCompleteJS={(result) => setTempColor(result.hex)}>
						<View className="pb-4">
							<Panel1 />
						</View>

						<View className="gap-2 px-2">
							<Text className="text-foreground-muted">Hue</Text>
							<HueSlider />
						</View>
					</ColorPicker>

					<View className="mt-4 flex-row gap-4">
						<Button variant="outline" className="flex-1" onPress={handleCancel}>
							<Text>Cancel</Text>
						</Button>
						<Button variant="brand" className="flex-1" onPress={handleConfirm}>
							<Text>Confirm</Text>
						</Button>
					</View>
				</View>
			</TrueSheet>
		</>
	)
}
