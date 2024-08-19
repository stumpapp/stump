import * as SwitchPrimitives from '@radix-ui/react-switch'
import { cva, VariantProps } from 'class-variance-authority'
import React from 'react'

import { cn } from '../../utils'

// TODO: figure out the contrast colors for default colors...

export const SWITCH_BASE_CLASSES = [
	'inline-flex shrink-0 cursor-pointer items-center rounded-full transition-colors',
	'border border-transparent',
	'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-background-400 focus:ring-offset-background',
	'disabled:cursor-not-allowed disabled:opacity-50',
	'data-[state=unchecked]:bg-background-surface-secondary',
]

export const SWITCH_SIZE_VARIANTS = {
	default: 'h-[24px] w-[44px]',
	sm: 'h-[20px] w-[36px]',
	xs: 'h-[16px] w-[28px]',
}
export const SWITCH_VARIANTS = {
	default: 'focus:ring-background-400 data-[state=checked]:bg-background-surface-secondary-hover',
	primary: 'focus:ring-brand-400 data-[state=checked]:bg-brand-400',
}
export const switchVariants = cva(SWITCH_BASE_CLASSES, {
	defaultVariants: {
		size: 'default',
		variant: 'default',
	},
	variants: {
		size: SWITCH_SIZE_VARIANTS,
		variant: SWITCH_VARIANTS,
	},
})

export type RawSwitchRef = React.ElementRef<typeof SwitchPrimitives.Root>
export type RawSwitchProps = VariantProps<typeof switchVariants> &
	React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root> & {
		primaryRing?: boolean
	}

export const RawSwitch = React.forwardRef<RawSwitchRef, RawSwitchProps>(
	({ className, variant, size = 'default', primaryRing, ...props }, ref) => {
		return (
			<SwitchPrimitives.Root
				className={cn(switchVariants({ className, size, variant }), {
					'focus:ring-brand-400': primaryRing,
				})}
				{...props}
				ref={ref}
			>
				<SwitchPrimitives.Thumb
					className={cn(
						'pointer-events-none block rounded-full bg-white shadow-lg ring-0 transition-transform',
						{
							'h-5 w-5 data-[state=checked]:translate-x-5 data-[state=unchecked]:translate-x-0':
								size === 'default',
						},
						{
							'h-4 w-4 data-[state=checked]:translate-x-4 data-[state=unchecked]:translate-x-0':
								size === 'sm',
						},
						{
							'h-3 w-3 data-[state=checked]:translate-x-3 data-[state=unchecked]:translate-x-0.5':
								size === 'xs',
						},
					)}
				/>
			</SwitchPrimitives.Root>
		)
	},
)
RawSwitch.displayName = SwitchPrimitives.Root.displayName
