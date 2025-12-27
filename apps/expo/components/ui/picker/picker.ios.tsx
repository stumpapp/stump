import { Host, Picker as NativePicker } from '@expo/ui/swift-ui'
import { disabled, fixedSize } from '@expo/ui/swift-ui/modifiers'

import { useColors } from '~/lib/constants'

import type { PickerProps } from './types'

export function Picker<T extends string = string>({
	value,
	options,
	onValueChange,
	disabled: isDisabled = false,
}: PickerProps<T>) {
	const { foreground } = useColors()

	return (
		<Host matchContents>
			<NativePicker
				variant="menu"
				selectedIndex={options.findIndex((option) => option.value === value)}
				onOptionSelected={({ nativeEvent: { index: selectedIndex } }) =>
					onValueChange(options[selectedIndex]!.value)
				}
				options={options.map((option) => option.label)}
				color={foreground.muted}
				modifiers={[disabled(isDisabled), fixedSize({ horizontal: true, vertical: true })]}
			/>
		</Host>
	)
}
