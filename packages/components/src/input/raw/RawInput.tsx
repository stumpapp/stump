import { cva, VariantProps } from 'class-variance-authority'
import React from 'react'

import { cn } from '../../utils'

export const RAW_INPUT_BASE_CLASSES = [
	'flex w-full min-w-0 items-center justify-between border border-border bg-input/30 px-3 py-1 text-base text-foreground transition-colors outline-none md:text-sm',
	'file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground',
	'placeholder:text-muted-foreground',
	'focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50',
	'aria-invalid:border-field-error-border aria-invalid:ring-[3px] aria-invalid:ring-field-error-ring',
	'disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50',
]
export const RAW_INPUT_SIZE_VARIANTS = {
	default: 'h-9',
	sm: 'h-8 px-2.5',
}
export const RAW_INPUT_VARIANT = {
	// TODO(shad): remove
	activeGhost: 'enabled:border-opacity-100 dark:enabled:border-opacity-100',
	default: 'bg-transparent',
	// TODO(shad): remove
	ghost:
		'border-opacity-0 enabled:hover:border-opacity-70 focus:border-opacity-100 dark:enabled:hover:border-opacity-70 dark:focus:border-opacity-100 dark:border-opacity-0 dark:focus:bg-transparent',
	// TODO(shad): remove
	primary: 'focus-visible:border-ring focus-visible:ring-ring/50',
	// TODO(shad): remove underline variant after consumer migration
	underline:
		// TODO(shad): remove
		'border-x-0 border-t-0 border-b-[1.5px] border-border/70 focus:ring-0 focus:ring-offset-0 outline-none focus:border-b-ring',
}
export const RAW_INPUT_VARIANTS = {
	contrast: {
		// TODO(shad): remove
		true: 'enabled:hover:bg-muted bg-input/30 focus:bg-input/50',
	},
	isInvalid: {
		// TODO(shad): remove
		true: 'border-field-error-border ring-[3px] ring-field-error-ring',
	},
	// TODO(shad): remove, will drive via tokens
	rounded: {
		default: 'rounded-md',
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
			// TODO(shad): remove underline invalid compound when underline variant is deleted
			className:
				'border-b-destructive bg-destructive/10 hover:bg-destructive/20 focus:bg-destructive/20',
			isInvalid: true,
			variant: 'underline',
		},
	],
	defaultVariants: {
		rounded: 'default',
		size: 'default',
		variant: 'default',
	},
	variants: RAW_INPUT_VARIANTS,
})
export type RawInputProps = VariantProps<typeof inputVariants> &
	Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> & {
		ignoreFill?: boolean
	}

export const RawInput = React.forwardRef<HTMLInputElement, RawInputProps>(
	({ className, variant, size, rounded, isInvalid, contrast, ignoreFill, ...props }, ref) => {
		return (
			<input
				className={cn(inputVariants({ className, contrast, isInvalid, rounded, size, variant }))}
				ref={ref}
				{...props}
				{...(ignoreFill ? { 'data-1p-ignore': true } : {})}
			/>
		)
	},
)
RawInput.displayName = 'RawInput'
