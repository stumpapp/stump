import { Host, Picker as NativePicker, Text as SwiftText } from '@expo/ui/swift-ui'
import {
	controlSize,
	disabled,
	fixedSize,
	pickerStyle,
	tag,
	tint,
} from '@expo/ui/swift-ui/modifiers'

import { useColors } from '~/lib/constants'

import type { PickerProps } from '../picker/types'

export function SegmentedPicker<T extends string = string>({
	value,
	options,
	onValueChange,
	disabled: isDisabled = false,
}: PickerProps<T>) {
	const { foreground } = useColors()

	return (
		<Host matchContents ignoreSafeArea="all">
			<NativePicker
				modifiers={[
					pickerStyle('segmented'),
					controlSize('regular'),
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
