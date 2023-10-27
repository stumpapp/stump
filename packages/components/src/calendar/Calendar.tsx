import { ChevronLeft, ChevronRight } from 'lucide-react'
import { DayPicker } from 'react-day-picker'

import { buttonVariants } from '../button'
import { cn } from '../utils'

export type CalendarProps = React.ComponentProps<typeof DayPicker>

// TODO: lots of styles not correct
export default function Calendar({
	className,
	classNames,
	showOutsideDays = true,
	...props
}: CalendarProps) {
	return (
		<DayPicker
			showOutsideDays={showOutsideDays}
			className={cn('p-3', className)}
			classNames={{
				caption: 'flex justify-center pt-1 relative items-center text-gray-900 dark:text-gray-100',
				caption_label: 'text-sm font-medium',
				cell: 'h-9 w-9 text-center text-sm p-0 relative [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20',
				day: cn(
					buttonVariants({ size: 'sm', variant: 'ghost' }),
					'h-8 w-8 p-0 font-normal aria-selected:opacity-100',
				),
				day_disabled: 'text-gray-500 dark:text-gray-450 opacity-50',
				day_hidden: 'invisible',
				day_outside: 'text-gray-500 dark:text-gray-450 opacity-50',
				day_range_middle: 'aria-selected:bg-accent aria-selected:text-accent-foreground',
				day_selected:
					'bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground',
				day_today: 'bg-accent text-accent-foreground',
				head_cell: 'text-gray-500 dark:text-gray-450 rounded-md w-9 font-normal text-[0.8rem]',
				head_row: 'flex',
				month: 'space-y-4',
				months: 'flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0',
				nav: 'space-x-1 flex items-center',
				nav_button: cn(
					buttonVariants({ variant: 'outline' }),
					'h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100',
				),
				nav_button_next: 'absolute right-1',
				nav_button_previous: 'absolute left-1',
				row: 'flex w-full mt-2',
				table: 'w-full border-collapse space-y-1',
				...classNames,
			}}
			components={{
				IconLeft: () => <ChevronLeft className="h-4 w-4" />,
				IconRight: () => <ChevronRight className="h-4 w-4" />,
			}}
			{...props}
		/>
	)
}
