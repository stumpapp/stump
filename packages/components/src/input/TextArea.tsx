import React from 'react'

import { Label } from '../form'
import { Text } from '../text'
import { cn } from '../utils'
import { RawTextArea, RawTextAreaProps, RawTextAreaRef } from './raw'

// TODO: error state
export type TextAreaProps = {
	/** The label for the input. */
	label: string
	/** The optional description for the textarea. */
	description?: string
	/** The optional error message to display. */
	errorMessage?: string
	/** The optional class name for the container. */
	containerClassName?: string
} & RawTextAreaProps

const TextArea = React.forwardRef<RawTextAreaRef, TextAreaProps>(
	({ label, description, containerClassName, errorMessage, variant, ...props }, ref) => {
		const isInvalid = !!errorMessage

		return (
			<div className={cn('grid items-center gap-1.5', containerClassName)}>
				<Label htmlFor={props.id}>{label}</Label>
				<RawTextArea variant={isInvalid ? 'error' : variant} ref={ref} {...props} />

				{errorMessage && (
					<Text variant="danger" size="xs" className="break-all">
						{errorMessage}
					</Text>
				)}

				{description && (
					<Text size="sm" variant="muted">
						{description}
					</Text>
				)}
			</div>
		)
	},
)
TextArea.displayName = 'TextArea'

export { TextArea }
