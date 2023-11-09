import { cva, VariantProps } from 'class-variance-authority'
import React from 'react'

import { cn } from '../../utils'

export const RAW_INPUT_BASE_CLASSES =
	'flex w-full border border-gray-300 border-opacity-70 bg-transparent autofill:shadow-fill-gray-50/50 dark:autofill:shadow-fill-gray-950 outline-none dark:autofill:text-fill-gray-100 text-sm transition-all duration-150 placeholder:text-gray-400 enabled:hover:border-opacity-100 enabled:hover:bg-gray-50/50 focus:bg-transparent focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:border-opacity-70 dark:text-gray-50 dark:enabled:hover:border-opacity-100  dark:enabled:hover:bg-gray-900/50 dark:focus:bg-transparent dark:focus:ring-offset-gray-900'
export const RAW_INPUT_SIZE_VARIANTS = {
	default: 'h-10 py-2 px-3',
}
export const RAW_INPUT_VARIANT = {
	default: 'focus:ring-gray-400 dark:focus:ring-gray-400',
	ghost:
		'border-opacity-0 enabled:hover:border-opacity-70 focus:border-opacity-100 dark:enabled:hover:border-opacity-70 dark:focus:border-opacity-100 dark:border-opacity-0 dark:enabled:hover:bg-gray-900/50 dark:focus:bg-transparent dark:focus:ring-offset-gray-900',
	primary: 'focus:ring-brand-400 dark:focus:ring-brand-400',
	underline:
		'border-x-0 border-t-0 border-b-[1.5px] border-gray-300 border-opacity-70 dark:border-gray-700 dark:border-opacity-70 focus:ring-0 focus:ring-offset-0 outline-none focus:border-b-brand',
}
export const RAW_INPUT_VARIANTS = {
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
	React.InputHTMLAttributes<HTMLInputElement>

export const RawInput = React.forwardRef<HTMLInputElement, RawInputProps>(
	({ className, variant, size, rounded, isInvalid, ...props }, ref) => {
		return (
			<input
				className={cn(inputVariants({ className, isInvalid, rounded, size, variant }))}
				ref={ref}
				{...props}
			/>
		)
	},
)
RawInput.displayName = 'RawInput'
