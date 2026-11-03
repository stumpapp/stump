import { DatePickerDialog, Host, TimePickerDialog } from '@expo/ui/jetpack-compose'
import { intlFormat } from 'date-fns'
import { useState } from 'react'
import { Pressable, View } from 'react-native'

import { Text } from '../text'
import { InlineDatePickerProps } from './types'

type ActiveDialog = 'date' | 'time' | null

// so much more annoying than ios >:'(

export function InlineDatePicker({
	value,
	onChange,
	displayedComponents = ['date'],
}: InlineDatePickerProps) {
	const [activeDialog, setActiveDialog] = useState<ActiveDialog>(null)

	const showDate = displayedComponents.includes('date')
	const showTime = displayedComponents.includes('hourAndMinute')

	// the dialogs seem to return a whole new Date, so we merge the picked part into the current
	// value to avoid nulling the time
	const onDatePicked = (picked: Date) => {
		const next = new Date(value)
		next.setFullYear(picked.getFullYear(), picked.getMonth(), picked.getDate())
		onChange(next)
	}

	const onTimePicked = (picked: Date) => {
		const next = new Date(value)
		next.setHours(picked.getHours(), picked.getMinutes(), picked.getSeconds())
		onChange(next)
	}

	return (
		<View className="gap-2 flex-row">
			{showDate && (
				<Pill onPress={() => setActiveDialog('date')}>
					{intlFormat(value, { month: 'short', day: 'numeric', year: 'numeric' })}
				</Pill>
			)}

			{showTime && (
				<Pill onPress={() => setActiveDialog('time')}>
					{intlFormat(value, { hour: 'numeric', minute: '2-digit' })}
				</Pill>
			)}

			{activeDialog === 'date' && (
				<Host matchContents>
					<DatePickerDialog
						initialDate={value.toISOString()}
						onDateSelected={(date) => {
							onDatePicked(date)
							setActiveDialog(null)
						}}
						onDismissRequest={() => setActiveDialog(null)}
					/>
				</Host>
			)}

			{activeDialog === 'time' && (
				<Host matchContents>
					<TimePickerDialog
						initialDate={value.toISOString()}
						onDateSelected={(date) => {
							onTimePicked(date)
							setActiveDialog(null)
						}}
						onDismissRequest={() => setActiveDialog(null)}
					/>
				</Host>
			)}
		</View>
	)
}

type PillProps = {
	children: string
	onPress: () => void
}

function Pill({ children, onPress }: PillProps) {
	return (
		<Pressable
			onPress={onPress}
			className="squircle px-3 py-1.5 bg-black/5 dark:bg-white/10 rounded-[2rem]"
		>
			<Text className="text-base font-medium">{children}</Text>
		</Pressable>
	)
}
