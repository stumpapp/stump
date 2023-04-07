import React from 'react'

import { Label } from '../form'
import { Text } from '../text'
import { cn } from '../utils'
import { RawInput, RawInputProps } from './raw'

// TODO: size prop
export type InputProps = {
	/** The label for the input. */
	label: string
	/** The optional props for the label. */
	labelProps?: Omit<React.ComponentPropsWithoutRef<typeof Label>, 'children'>
	/** The optional description for the input. */
	description?: string
	/** The optional props for the description. */
	descriptionProps?: Omit<React.ComponentPropsWithoutRef<typeof Text>, 'children'>
	/** The optional class name for the container. */
	containerClassName?: string
} & RawInputProps

// TODO: icon

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
	({ label, description, labelProps, descriptionProps, containerClassName, ...props }, ref) => {
		return (
			<div className={cn('grid w-full max-w-sm items-center gap-1.5', containerClassName)}>
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
