import type { PickerProps } from '../picker/types'
import { Tabs } from '../tabs'
import { Text } from '../text'

export function SegmentedPicker<T extends string = string>({
	value,
	options,
	onValueChange,
	disabled: isDisabled = false,
}: PickerProps<T>) {
	return (
		<Tabs value={value} onValueChange={(v) => onValueChange(v as T)}>
			<Tabs.List className="flex-row">
				{options.map((option) => (
					<Tabs.Trigger key={option.value} value={option.value} disabled={isDisabled}>
						<Text>{option.label}</Text>
					</Tabs.Trigger>
				))}
			</Tabs.List>
		</Tabs>
	)
}
