/* eslint-disable react/prop-types */
import * as RadioGroupPrimitive from '@radix-ui/react-radio-group'
import { Circle } from 'lucide-react'
import * as React from 'react'

import { cn } from '../utils'
import { RadioCardItem } from './RadioCardItem'

export type RadioGroupProps = React.ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Root>
export const RadioGroup = React.forwardRef<
	React.ElementRef<typeof RadioGroupPrimitive.Root>,
	RadioGroupProps
>(({ className, ...props }, ref) => {
	return <RadioGroupPrimitive.Root className={cn('grid gap-2', className)} {...props} ref={ref} />
}) as typeof RadioGroupPrimitive.Root & RadioGroupSubComponents
RadioGroup.displayName = RadioGroupPrimitive.Root.displayName

export type RadioGroupItemProps = Omit<
	React.ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Item>,
	'children'
>
const RadioGroupItem = React.forwardRef<
	React.ElementRef<typeof RadioGroupPrimitive.Item>,
	RadioGroupItemProps
>(({ className, ...props }, ref) => {
	return (
		<RadioGroupPrimitive.Item
			ref={ref}
			className={cn(
				'ring-offset-background h-4 w-4 rounded-full border focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-brand-400 dark:border-gray-300 dark:border-opacity-60 dark:ring-offset-gray-900',
				className,
			)}
			{...props}
		>
			<RadioGroupPrimitive.Indicator className="flex items-center justify-center">
				<Circle className="text-primary h-2 w-2 fill-white text-brand-400 dark:fill-gray-50" />
			</RadioGroupPrimitive.Indicator>
		</RadioGroupPrimitive.Item>
	)
})
RadioGroupItem.displayName = RadioGroupPrimitive.Item.displayName

type RadioGroupSubComponents = {
	Item: typeof RadioGroupItem
	CardItem: typeof RadioCardItem
}
RadioGroup.Item = RadioGroupItem
RadioGroup.CardItem = RadioCardItem
