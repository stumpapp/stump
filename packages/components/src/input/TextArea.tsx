import React from 'react'

import { Label } from '../form'
import { Text } from '../text'
import { cn } from '../utils'
import { RawTextArea, RawTextAreaProps, RawTextAreaRef } from './raw'

export type TextAreaProps = {
	/** The label for the input. */
	label?: string
	/** The optional description for the textarea. */
	description?: string
	/** The optional invalid state. */
	isInvalid?: boolean
	/** The optional error message to display. */
	errorMessage?: string
	/** The optional class name for the container. */
	containerClassName?: string
} & RawTextAreaProps

const TextArea = React.forwardRef<RawTextAreaRef, TextAreaProps>(
	({ label, description, containerClassName, errorMessage, isInvalid, ...props }, ref) => {
		const resolvedInvalid = isInvalid ?? !!errorMessage

		return (
			<div className={cn('gap-1.5 grid items-center', containerClassName)}>
				{label && (
					<Label
						htmlFor={props.id}
						className={cn({
							'cursor-not-allowed opacity-50': props.disabled,
						})}
					>
						{label}
						{props.required && <span className="text-destructive"> *</span>}
					</Label>
				)}
				<RawTextArea ref={ref} aria-invalid={resolvedInvalid} {...props} />

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
