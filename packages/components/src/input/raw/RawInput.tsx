import { cva, VariantProps } from 'class-variance-authority'
import React from 'react'

import { cn } from '../../utils'

export const RAW_INPUT_BASE_CLASSES = [
	'flex w-full items-center justify-between transition-all duration-150 ',
	'enabled:hover:bg-background-surface bg-transparent focus:bg-transparent',
	'border-edge-subtle border outline-none',
	'focus:ring-offset-background focus:outline-none focus:ring-2 focus:ring-brand-400 focus:ring-offset-2 focus:ring-offset-background',
	'text-foreground-subtle placeholder:text-foreground-muted text-sm',
	'disabled:cursor-not-allowed disabled:opacity-50',
]
export const RAW_INPUT_SIZE_VARIANTS = {
	default: 'h-10 py-2 px-3',
	sm: 'h-8 p-2',
}
export const RAW_INPUT_VARIANT = {
	activeGhost: 'enabled:border-opacity-100 dark:enabled:border-opacity-100',
	default: 'focus:ring-background-400 dark:focus:ring-background-400',
	ghost:
		'border-opacity-0 enabled:hover:border-opacity-70 focus:border-opacity-100 dark:enabled:hover:border-opacity-70 dark:focus:border-opacity-100 dark:border-opacity-0 dark:focus:bg-transparent',
	primary: 'focus:ring-brand-400 dark:focus:ring-brand-400',
	underline:
		'border-x-0 border-t-0 border-b-[1.5px] border-gray-300 border-opacity-70 dark:border-gray-700 dark:border-opacity-70 focus:ring-0 focus:ring-offset-0 outline-none focus:border-b-brand',
}
export const RAW_INPUT_VARIANTS = {
	contrast: {
		true: 'enabled:hover:bg-background-surface bg-background/40 focus:bg-background/80',
	},
	isInvalid: {
		true: 'focus:ring-red-400 dark:focus:ring-red-400 border border-red-300 border-opacity-70 dark:border-red-400 dark:border-opacity-70',
	},
	rounded: {
		md: 'rounded-md',
		none: 'rounded-none',
		sm: 'rounded-sm',
	},
	size: RAW_INPUT_SIZE_VARIANTS,
	variant: RAW_INPUT_VARIANT,
}

export const inputVariants = cva(RAW_INPUT_BASE_CLASSES, {
	compoundVariants: [
		{
			className: 'rounded-none',
			variant: 'underline',
		},
		{
			className:
				'border-b-red-400 dark:border-b-red-400 bg-red-50/50 hover:bg-red-100/50 focus:bg-red-100/50',
			isInvalid: true,
			variant: 'underline',
		},
	],
	defaultVariants: {
		rounded: 'md',
		size: 'default',
		variant: 'default',
	},
	variants: RAW_INPUT_VARIANTS,
})
export type RawInputProps = VariantProps<typeof inputVariants> &
	Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'>

export const RawInput = React.forwardRef<HTMLInputElement, RawInputProps>(
	({ className, variant, size, rounded, isInvalid, contrast, ...props }, ref) => {
		return (
			<input
				className={cn(inputVariants({ className, contrast, isInvalid, rounded, size, variant }))}
				ref={ref}
				{...props}
			/>
		)
	},
)
RawInput.displayName = 'RawInput'
