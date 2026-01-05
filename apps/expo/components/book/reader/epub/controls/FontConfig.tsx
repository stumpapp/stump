import { View } from 'react-native'

import { CardList, Stepper, Switch, Text } from '~/components/ui'
import { Picker } from '~/components/ui/picker/picker'
import type { PickerOption } from '~/components/ui/picker/types'
import { useReaderStore } from '~/stores'

const FONT_OPTIONS: PickerOption[] = [
	{ label: 'System', value: '' },
	{ label: 'OpenDyslexic', value: 'OpenDyslexic' },
	{ label: 'Literata', value: 'Literata' },
	{ label: 'Atkinson Hyperlegible', value: 'Atkinson-Hyperlegible' },
	{ label: 'Charis SIL', value: 'CharisSIL' },
	{ label: 'Bitter', value: 'Bitter' },
]

const FONT_WEIGHT_OPTIONS: PickerOption[] = [
	{ label: 'Light', value: '300' },
	{ label: 'Normal', value: '400' },
	{ label: 'Medium', value: '500' },
	{ label: 'Bold', value: '700' },
]

export default function FontConfig() {
	const store = useReaderStore((state) => ({
		fontFamily: state.globalSettings.fontFamily ?? '',
		fontSize: state.globalSettings.fontSize ?? 16,
		fontWeight: state.globalSettings.fontWeight ?? 400,
		textNormalization: state.globalSettings.textNormalization ?? false,
		verticalText: state.globalSettings.verticalText ?? false,
		setSettings: state.setGlobalSettings,
	}))

	const ensureNumber = (value: string, cb: (num: number) => void) => {
		const parsed = parseInt(value, 10)
		if (!isNaN(parsed)) {
			cb(parsed)
		}
	}

	return (
		<CardList>
			<View className="flex-row items-center justify-between px-6 py-3">
				<Text className="text-lg">Typeface</Text>
				<Picker
					value={store.fontFamily}
					options={FONT_OPTIONS}
					onValueChange={(value) => store.setSettings({ fontFamily: value || undefined })}
				/>
			</View>

			<View className="flex-row items-center justify-between px-6 py-3">
				<Text className="text-lg">Font Size</Text>
				<Stepper
					value={store.fontSize}
					onChange={(val) => store.setSettings({ fontSize: Math.round(val) })}
					min={8}
					max={32}
					step={1}
					formatValue={(val) => val.toString()}
					accessibilityLabel="Font Size"
				/>
			</View>

			<View className="flex-row items-center justify-between px-6 py-3">
				<Text className="text-lg">Font Weight</Text>
				<Picker
					value={String(store.fontWeight)}
					options={FONT_WEIGHT_OPTIONS}
					onValueChange={(value) =>
						ensureNumber(value, (num) => store.setSettings({ fontWeight: num }))
					}
				/>
			</View>

			<View className="flex-row items-center justify-between px-6 py-3">
				<Text
					className="text-lg"
					onPress={() => store.setSettings({ textNormalization: !store.textNormalization })}
				>
					Text Normalization
				</Text>
				<Switch
					checked={store.textNormalization}
					onCheckedChange={(checked) => store.setSettings({ textNormalization: checked })}
					accessibilityLabel="Toggle Text Normalization"
				/>
			</View>

			<View className="flex-row items-center justify-between px-6 py-3">
				<Text
					className="text-lg"
					onPress={() => store.setSettings({ textNormalization: !store.textNormalization })}
				>
					Vertical Text
				</Text>
				<Switch
					checked={store.verticalText}
					onCheckedChange={(checked) => store.setSettings({ verticalText: checked })}
					accessibilityLabel="Toggle Vertical Text"
				/>
			</View>
		</CardList>
	)
}
