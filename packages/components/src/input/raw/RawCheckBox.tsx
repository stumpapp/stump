import * as CheckboxPrimitive from '@radix-ui/react-checkbox'
import { cva, VariantProps } from 'class-variance-authority'
import { Check } from 'lucide-react'
import type { ComponentPropsWithoutRef, ElementRef } from 'react'
import React from 'react'

import { cn } from '../../utils'

export const RAW_CHECKBOX_BASE_CLASSES =
	'peer relative shrink-0 border border-border bg-background text-foreground transition-shadow outline-none after:absolute after:-inset-x-3 after:-inset-y-2 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground aria-invalid:border-field-error-border aria-invalid:ring-[3px] aria-invalid:ring-field-error-ring aria-invalid:data-[state=checked]:border-primary dark:bg-input/30'
export const RAW_CHECKBOX_SIZE_VARIANTS = {
	default: 'h-4 w-4',
	lg: 'h-6 w-6',
	md: 'h-5 w-5',
	sm: 'h-3 w-3',
}
export const RAW_CHECKBOX_ROUND_VARIANTS = {
	default: 'rounded-[6px]',
	lg: 'rounded-md',
	none: 'rounded-none',
}
export const checkboxVariants = cva(RAW_CHECKBOX_BASE_CLASSES, {
	defaultVariants: {
		rounded: 'default',
		size: 'default',
	},
	variants: {
		rounded: RAW_CHECKBOX_ROUND_VARIANTS,
		size: RAW_CHECKBOX_SIZE_VARIANTS,
	},
})

export type RawCheckBoxRef = ElementRef<typeof CheckboxPrimitive.Root>
export type RawCheckBoxProps = VariantProps<typeof checkboxVariants> &
	ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>

export const RawCheckBox = React.forwardRef<RawCheckBoxRef, RawCheckBoxProps>(
	({ className, size, rounded, ...props }, ref) => (
		<CheckboxPrimitive.Root
			ref={ref}
			className={cn(checkboxVariants({ className, rounded, size }))}
			{...props}
			data-testid={props.id}
		>
			<CheckboxPrimitive.Indicator
				className={cn('grid place-content-center text-current transition-none')}
			>
				<Check
					className={cn('font-medium text-current', {
						'size-3.5': (size || 'default') === 'default',
						'size-3': size === 'sm',
						'size-4': size === 'md',
						'size-5': size === 'lg',
					})}
				/>
			</CheckboxPrimitive.Indicator>
		</CheckboxPrimitive.Root>
	),
)
RawCheckBox.displayName = CheckboxPrimitive.Root.displayName
