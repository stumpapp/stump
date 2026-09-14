import { Host, Picker as NativePicker, Text as SwiftText } from '@expo/ui/swift-ui'
import { disabled, fixedSize, pickerStyle, tag, tint } from '@expo/ui/swift-ui/modifiers'

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
		// This negative margin is because there is some padding around the picker making it larger than it's true size
		<Host matchContents style={{ marginHorizontal: -12, marginVertical: -6 }} ignoreSafeArea="all">
			<NativePicker
				modifiers={[
					pickerStyle('menu'),
					disabled(isDisabled),
					fixedSize({ horizontal: true, vertical: true }),
					tint(foreground.muted),
				]}
				onSelectionChange={(selection) => {
					const selected = options.find((option) => option.value === selection)
					if (selected) onValueChange(selected.value)
				}}
				selection={value}
			>
				{options.map((option) => (
					<SwiftText key={option.value} modifiers={[tag(option.value)]}>
						{option.label}
					</SwiftText>
				))}
			</NativePicker>
		</Host>
	)
}
