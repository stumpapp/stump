import { View } from 'react-native'

import { Text } from '~/components/ui'
import { Picker } from '~/components/ui/picker/picker'
import type { PickerOption } from '~/components/ui/picker/types'
import { useReaderStore } from '~/stores'

const COLUMN_OPTIONS: PickerOption[] = [
	{ label: 'Auto', value: 'auto' },
	{ label: 'Single', value: '1' },
	{ label: 'Double', value: '2' },
]

export default function ColumnCount() {
	const store = useReaderStore((state) => ({
		columnCount: state.globalSettings.columnCount ?? 'auto',
		setSettings: state.setGlobalSettings,
	}))

	const handleChange = (value: string) => {
		const columnCount = value === 'auto' ? 'auto' : (parseInt(value, 10) as 1 | 2)
		store.setSettings({ columnCount })
	}

	return (
		<View className="flex-row items-center justify-between px-6 py-3">
			<Text className="text-lg text-foreground">Columns</Text>
			<Picker
				value={String(store.columnCount)}
				options={COLUMN_OPTIONS}
				onValueChange={handleChange}
			/>
		</View>
	)
}
