'use client'

import { format } from 'date-fns'
import { Calendar as CalendarIcon } from 'lucide-react'
import * as React from 'react'

import { Button } from '../button'
import { Label } from '../form'
import { Popover, PopoverContent, PopoverTrigger } from '../popover'
import { cn } from '../utils'
import Calendar from './Calendar'

type DatePickerProps = {
	label?: string
	selected?: Date
	onChange: (date?: Date) => void
	minDate?: Date
	maxDate?: Date
}

// TODO: presets
// TODO: width/sizes
export function DatePicker({ label, selected, onChange, ...calendarProps }: DatePickerProps) {
	return (
		<Popover>
			<PopoverTrigger asChild>
				<div
					className={cn('w-[280px]', {
						'flex flex-col gap-1.5': !!label,
					})}
				>
					{label && <Label>{label}</Label>}
					<Button
						variant="outline"
						size="md"
						type="button"
						className={cn(
							'w-full justify-start text-left font-normal',
							!selected && 'text-gray-500 dark:text-gray-450',
						)}
					>
						<CalendarIcon className="mr-2 h-4 w-4" />
						{selected ? format(selected, 'PPP') : <span>Pick a date</span>}
					</Button>
				</div>
			</PopoverTrigger>
			<PopoverContent className="w-auto p-0">
				<Calendar
					mode="single"
					selected={selected}
					onSelect={onChange}
					initialFocus
					fromDate={calendarProps.minDate}
					toDate={calendarProps.maxDate}
				/>
			</PopoverContent>
		</Popover>
	)
}
