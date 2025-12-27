import { View } from 'react-native'

import { Stepper, Text } from '~/components/ui'
import { useReaderStore } from '~/stores'

export default function PageMargins() {
	const store = useReaderStore((state) => ({
		pageMargins: state.globalSettings.pageMargins ?? 1.0,
		setSettings: state.setGlobalSettings,
	}))

	return (
		<View className="flex-row items-center justify-between px-6 py-3">
			<Text className="text-lg text-foreground">Page Margins</Text>
			<Stepper
				value={store.pageMargins}
				onChange={(val) => store.setSettings({ pageMargins: val })}
				min={0.5}
				max={2.0}
				step={0.1}
				unit="%"
				formatValue={(val) => Math.round(val * 100).toString()}
				accessibilityLabel="Page Margins"
			/>
		</View>
	)
}
