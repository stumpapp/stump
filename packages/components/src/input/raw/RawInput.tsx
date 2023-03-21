import { cva, VariantProps } from 'class-variance-authority'
import React from 'react'

import { cn } from '../../utils'

export const RAW_INPUT_BASE_CLASSES =
	'flex w-full rounded-md border border-gray-300 border-opacity-70 bg-transparent autofill:shadow-fill-gray-50/50 dark:autofill:shadow-fill-gray-950 dark:autofill:text-fill-gray-100 text-sm transition-all duration-150 placeholder:text-gray-400 hover:border-opacity-100 hover:bg-gray-50/50 focus:bg-transparent focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:border-opacity-70 dark:text-gray-50 dark:hover:border-opacity-100  dark:hover:bg-gray-900/50 dark:focus:bg-transparent dark:focus:ring-offset-gray-900'
export const RAW_INPUT_SIZE_VARIANTS = {
	default: 'h-10 py-2 px-3',
}
export const RAW_INPUT_VARIANTS = {
	default: 'focus:ring-gray-400 dark:focus:ring-gray-400',
	primary: 'focus:ring-brand-400 dark:focus:ring-brand-400',
}
export const inputVariants = cva(RAW_INPUT_BASE_CLASSES, {
	defaultVariants: {
		size: 'default',
		variant: 'default',
	},
	variants: {
		size: RAW_INPUT_SIZE_VARIANTS,
		variant: RAW_INPUT_VARIANTS,
	},
})
export type RawInputProps = VariantProps<typeof inputVariants> &
	React.InputHTMLAttributes<HTMLInputElement>

export const RawInput = React.forwardRef<HTMLInputElement, RawInputProps>(
	({ className, variant, size, ...props }, ref) => {
		return (
			<input className={cn(inputVariants({ className, size, variant }))} ref={ref} {...props} />
		)
	},
)
RawInput.displayName = 'RawInput'
