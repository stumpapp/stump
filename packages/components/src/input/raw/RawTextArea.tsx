import { cva, VariantProps } from 'class-variance-authority'
import React from 'react'

import { cn } from '../../utils'
import { RAW_INPUT_BASE_CLASSES, RAW_INPUT_VARIANTS } from './RawInput'

export const RAW_TEXT_AREA_SIZE_VARIANTS = {
	default: 'h-20 py-2 px-3',
}
export const textAreaVariants = cva(RAW_INPUT_BASE_CLASSES, {
	defaultVariants: {
		size: 'default',
		variant: 'default',
	},
	variants: {
		size: RAW_TEXT_AREA_SIZE_VARIANTS,
		variant: RAW_INPUT_VARIANTS,
	},
})

export type RawTextAreaRef = HTMLTextAreaElement
export type RawTextAreaProps = VariantProps<typeof textAreaVariants> &
	React.TextareaHTMLAttributes<HTMLTextAreaElement>

const RawTextArea = React.forwardRef<RawTextAreaRef, RawTextAreaProps>(
	({ className, variant, size, ...props }, ref) => {
		return (
			<textarea
				className={cn(textAreaVariants({ className, size, variant }))}
				ref={ref}
				{...props}
			/>
		)
	},
)
RawTextArea.displayName = 'RawTextArea'

export { RawTextArea }
