import * as SwitchPrimitives from '@radix-ui/react-switch'
import { cva, VariantProps } from 'class-variance-authority'
import type { ComponentPropsWithoutRef, ElementRef } from 'react'
import React from 'react'

import { cn } from '../../utils'

export const SWITCH_BASE_CLASSES = [
	'peer group/switch relative inline-flex shrink-0 items-center rounded-full border border-transparent transition-all outline-none',
	'after:absolute after:-inset-x-3 after:-inset-y-2',
	'focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50',
	'aria-invalid:border-field-error-border aria-invalid:ring-[3px] aria-invalid:ring-field-error-ring',
	'data-[state=checked]:bg-primary data-[state=unchecked]:bg-switch',
	'disabled:cursor-not-allowed disabled:opacity-50',
]

export const SWITCH_SIZE_VARIANTS = {
	default: 'h-[18.4px] w-8',
	sm: 'h-3.5 w-6',
}
export const switchVariants = cva(SWITCH_BASE_CLASSES, {
	defaultVariants: {
		size: 'default',
	},
	variants: {
		size: SWITCH_SIZE_VARIANTS,
	},
})

export type RawSwitchRef = ElementRef<typeof SwitchPrimitives.Root>
export type RawSwitchProps = VariantProps<typeof switchVariants> &
	ComponentPropsWithoutRef<typeof SwitchPrimitives.Root>

export const RawSwitch = React.forwardRef<RawSwitchRef, RawSwitchProps>(
	({ className, size = 'default', ...props }, ref) => {
		return (
			<SwitchPrimitives.Root
				className={cn(switchVariants({ className, size }))}
				{...props}
				ref={ref}
			>
				<SwitchPrimitives.Thumb
					className={cn(
						'pointer-events-none block rounded-full ring-0 transition-transform data-[state=checked]:bg-switch-thumb-checked data-[state=unchecked]:bg-switch-thumb',
						{
							'data-[state=unchecked]:translate-x-0 size-4 data-[state=checked]:translate-x-[calc(100%-2px)]':
								size === 'default',
						},
						{
							'size-3 data-[state=unchecked]:translate-x-0 data-[state=checked]:translate-x-[calc(100%-2px)]':
								size === 'sm',
						},
					)}
				/>
			</SwitchPrimitives.Root>
		)
	},
)
RawSwitch.displayName = SwitchPrimitives.Root.displayName
