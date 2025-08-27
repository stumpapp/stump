import * as CheckboxPrimitive from '@radix-ui/react-checkbox'
import { cva, VariantProps } from 'class-variance-authority'
import { Check } from 'lucide-react'
import type { ComponentPropsWithoutRef, ElementRef } from 'react'
import React from 'react'

import { cn } from '../../utils'

export const RAW_CHECKBOX_BASE_CLASSES =
	'shrink-0 border border-gray-300 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50  focus:ring-offset-background'
export const RAW_CHECKBOX_SIZE_VARIANTS = {
	default: 'h-4 w-4',
	lg: 'h-6 w-6',
	md: 'h-5 w-5',
	sm: 'h-3 w-3',
}
export const RAW_CHECKBOX_ROUND_VARIANTS = {
	default: 'rounded-sm',
	lg: 'rounded-md',
	none: 'rounded-none',
}
export const RAW_CHECKBOX_VARIANTS = {
	default: 'focus:ring-gray-400  dark:text-gray-50 dark:focus:ring-gray-400',
	primary: 'focus:ring-edge-brand text-foreground-brand',
}
export const checkboxVariants = cva(RAW_CHECKBOX_BASE_CLASSES, {
	defaultVariants: {
		rounded: 'default',
		size: 'default',
		variant: 'default',
	},
	variants: {
		rounded: RAW_CHECKBOX_ROUND_VARIANTS,
		size: RAW_CHECKBOX_SIZE_VARIANTS,
		variant: RAW_CHECKBOX_VARIANTS,
	},
})

export type RawCheckBoxRef = ElementRef<typeof CheckboxPrimitive.Root>
export type RawCheckBoxProps = VariantProps<typeof checkboxVariants> &
	ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>

export const RawCheckBox = React.forwardRef<RawCheckBoxRef, RawCheckBoxProps>(
	({ className, variant, size, rounded, ...props }, ref) => (
		<CheckboxPrimitive.Root
			ref={ref}
			className={cn(checkboxVariants({ className, rounded, size, variant }))}
			{...props}
			data-testid={props.id}
		>
			<CheckboxPrimitive.Indicator className={cn('flex items-center justify-center')}>
				<Check className={cn(RAW_CHECKBOX_SIZE_VARIANTS[size || 'default'], 'font-medium')} />
			</CheckboxPrimitive.Indicator>
		</CheckboxPrimitive.Root>
	),
)
RawCheckBox.displayName = CheckboxPrimitive.Root.displayName
