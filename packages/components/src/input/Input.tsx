import React from 'react'

import { Label } from '../form'
import { Text } from '../text'
import { RawInput, RawInputProps } from './raw'

export type InputProps = {
	/** The label for the input. */
	label: string
	/** The optional props for the label. */
	labelProps?: Omit<React.ComponentPropsWithoutRef<typeof Label>, 'children'>
	/** The optional description for the input. */
	description?: string
	/** The optional props for the description. */
	descriptionProps?: Omit<React.ComponentPropsWithoutRef<typeof Text>, 'children'>
} & RawInputProps

// TODO: icon

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
	({ label, description, labelProps, descriptionProps, ...props }, ref) => {
		return (
			<div className="grid w-full max-w-sm items-center gap-1.5">
				<Label htmlFor={props.id} {...(labelProps || {})}>
					{label}
				</Label>
				<RawInput {...props} ref={ref} />
				{description && (
					<Text variant="muted" size="sm" {...(descriptionProps || {})}>
						{description}
					</Text>
				)}
			</div>
		)
	},
)
Input.displayName = 'Input'
