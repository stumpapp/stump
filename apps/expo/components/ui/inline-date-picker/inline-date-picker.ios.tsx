import { DatePicker, Host } from '@expo/ui/swift-ui'
import { datePickerStyle } from '@expo/ui/swift-ui/modifiers'

import { InlineDatePickerProps } from './types'

// god this was so much easier than android >:'(

export function InlineDatePicker({
	value,
	onChange,
	displayedComponents = ['date'],
}: InlineDatePickerProps) {
	return (
		<Host matchContents>
			<DatePicker
				selection={value}
				displayedComponents={displayedComponents}
				onDateChange={onChange}
				modifiers={[datePickerStyle('compact')]}
			/>
		</Host>
	)
}
