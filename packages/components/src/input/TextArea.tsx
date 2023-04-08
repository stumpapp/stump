import React from 'react'

import { Label } from '../form'
import { cn } from '../utils'
import { RawTextArea, RawTextAreaProps, RawTextAreaRef } from './raw'

// TODO: error state
export type TextAreaProps = {
	/** The label for the input. */
	label: string
	/** The optional description for the textarea. */
	description?: string
	/** The optional class name for the container. */
	containerClassName?: string
} & RawTextAreaProps

const TextArea = React.forwardRef<RawTextAreaRef, TextAreaProps>(
	({ label, description, containerClassName, ...props }, ref) => {
		return (
			<div className={cn('grid items-center gap-1.5', containerClassName)}>
				<Label htmlFor={props.id}>{label}</Label>
				<RawTextArea ref={ref} {...props} />
				{description && <p className="text-sm text-gray-500 dark:text-gray-400">{description}</p>}
			</div>
		)
	},
)
TextArea.displayName = 'TextArea'

export { TextArea }
