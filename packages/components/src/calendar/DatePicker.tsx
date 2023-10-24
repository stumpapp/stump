'use client'

import { format } from 'date-fns'
import { Calendar as CalendarIcon } from 'lucide-react'
import * as React from 'react'

import { Button } from '../button'
import { Popover, PopoverContent, PopoverTrigger } from '../popover'
import { cn } from '../utils'
import Calendar from './Calendar'

type DatePickerProps = {
	selected?: Date
	onChange: (date?: Date) => void
	minDate?: Date
	maxDate?: Date
}

// TODO: presets
// TODO: width/sizes
export function DatePicker({ selected, onChange, ...calendarProps }: DatePickerProps) {
	return (
		<Popover>
			<PopoverTrigger asChild>
				<Button
					variant="outline"
					size="md"
					className={cn(
						'w-[280px] justify-start text-left font-normal',
						!selected && 'text-gray-500 dark:text-gray-450',
					)}
				>
					<CalendarIcon className="mr-2 h-4 w-4" />
					{selected ? format(selected, 'PPP') : <span>Pick a date</span>}
				</Button>
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
