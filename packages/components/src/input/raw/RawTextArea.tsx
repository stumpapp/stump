import { cva, VariantProps } from 'class-variance-authority'
import React from 'react'

import { cn } from '../../utils'

export const RAW_TEXT_AREA_BASE_CLASSES = [
	'flex field-sizing-content min-h-16 w-full resize-none rounded-md border border-border bg-input/30 px-3 py-3 text-base transition-colors outline-none md:text-sm',
	'placeholder:text-muted-foreground',
	'focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50',
	'disabled:cursor-not-allowed disabled:opacity-50',
	'aria-invalid:border-field-error-border aria-invalid:ring-[3px] aria-invalid:ring-field-error-ring',
]

export const RAW_TEXT_AREA_SIZE_VARIANTS = {
	default: '',
}
export const RAW_TEXT_AREA_VARIANTS = {
	size: RAW_TEXT_AREA_SIZE_VARIANTS,
}
export const textAreaVariants = cva(RAW_TEXT_AREA_BASE_CLASSES, {
	defaultVariants: {
		size: 'default',
	},
	variants: RAW_TEXT_AREA_VARIANTS,
})

export type RawTextAreaRef = HTMLTextAreaElement
export type RawTextAreaProps = VariantProps<typeof textAreaVariants> &
	React.TextareaHTMLAttributes<HTMLTextAreaElement>

const RawTextArea = React.forwardRef<RawTextAreaRef, RawTextAreaProps>(
	({ className, size, ...props }, ref) => {
		return (
			<textarea
				data-slot="textarea"
				className={cn(textAreaVariants({ className, size }))}
				ref={ref}
				{...props}
			/>
		)
	},
)
RawTextArea.displayName = 'RawTextArea'

export { RawTextArea }
