import { cva, VariantProps } from 'class-variance-authority'
import React from 'react'

import { cn } from '../../utils'

export const RAW_INPUT_BASE_CLASSES = [
	'flex h-9 w-full min-w-0 items-center justify-between rounded-interactive border border-border bg-input/30 px-3 py-1 text-base text-foreground transition-colors outline-none md:text-sm',
	'file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground',
	'placeholder:text-muted-foreground',
	'focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50',
	'aria-invalid:border-field-error-border aria-invalid:ring-[3px] aria-invalid:ring-field-error-ring',
	'disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50',
]
export const RAW_INPUT_SIZE_VARIANTS = {
	default: '',
	sm: 'h-8 px-2.5',
}
export const RAW_INPUT_VARIANTS = {
	size: RAW_INPUT_SIZE_VARIANTS,
}

export const inputVariants = cva(RAW_INPUT_BASE_CLASSES, {
	defaultVariants: {
		size: 'default',
	},
	variants: RAW_INPUT_VARIANTS,
})
export type RawInputProps = VariantProps<typeof inputVariants> &
	Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> & {
		ignoreFill?: boolean
	}

export const RawInput = React.forwardRef<HTMLInputElement, RawInputProps>(
	({ className, size, ignoreFill, ...props }, ref) => {
		return (
			<input
				className={cn(inputVariants({ className, size }))}
				ref={ref}
				{...props}
				{...(ignoreFill ? { 'data-1p-ignore': true } : {})}
			/>
		)
	},
)
RawInput.displayName = 'RawInput'
