import { View } from 'react-native'

import { Heading, Label, RadioGroup, RadioGroupItem } from '~/components/ui'
import { ColumnCount as ColumnCountType } from '~/modules/readium'
import { useReaderStore } from '~/stores'

const COLUMN_OPTIONS: { label: string; value: ColumnCountType }[] = [
	{ label: 'Auto', value: 'auto' },
	{ label: 'Single', value: 1 },
	{ label: 'Double', value: 2 },
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
		<View className="gap-2">
			<Heading className="pl-4">Columns</Heading>

			<View className="px-6">
				<RadioGroup
					value={String(store.columnCount)}
					onValueChange={handleChange}
					className="flex-row gap-6"
				>
					{COLUMN_OPTIONS.map((option) => (
						<View key={String(option.value)} className="flex-row items-center gap-2">
							<RadioGroupItem value={String(option.value)} />
							<Label htmlFor={String(option.value)}>{option.label}</Label>
						</View>
					))}
				</RadioGroup>
			</View>
		</View>
	)
}
