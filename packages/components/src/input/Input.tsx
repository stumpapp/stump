/* eslint-disable react/prop-types */
import React from 'react'

import { Label } from '../text'
import { RawInput } from './RawInput'

export type InputProps = {
	label: string
	description?: string
} & React.InputHTMLAttributes<HTMLInputElement>

// TODO: icon

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
	({ label, description, ...props }, ref) => {
		return (
			<div className="grid w-full max-w-sm items-center gap-1.5">
				<Label htmlFor={props.id}>{label}</Label>
				<RawInput {...props} ref={ref} />
				{description && <p className="text-sm text-gray-500 dark:text-gray-400">{description}</p>}
			</div>
		)
	},
)
Input.displayName = 'Input'
