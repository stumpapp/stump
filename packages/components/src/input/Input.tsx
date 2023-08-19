import React from 'react'

import { Label } from '../form'
import { Text } from '../text'
import { cn } from '../utils'
import { RawInput, RawInputProps } from './raw'

// TODO: size prop
export type InputProps = {
	/** The label for the input. */
	label?: string
	/** The optional props for the label. */
	labelProps?: Omit<React.ComponentPropsWithoutRef<typeof Label>, 'children'>
	/** The optional description for the input. */
	description?: string
	/** The optional props for the description. */
	descriptionProps?: Omit<React.ComponentPropsWithoutRef<typeof Text>, 'children'>
	/** The optional variant for the input. */
	fullWidth?: boolean
	/** The optional error message to display. */
	errorMessage?: string
	/** The optional class name for the container. */
	containerClassName?: string
	/** An optional right icon to display inset the input */
	leftDecoration?: React.ReactNode
	/** An optional right icon to display inset the input */
	rightDecoration?: React.ReactNode
} & RawInputProps

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
	(
		{
			label,
			description,
			labelProps,
			descriptionProps,
			fullWidth,
			containerClassName,
			leftDecoration,
			rightDecoration,
			errorMessage,
			className,
			...props
		},
		ref,
	) => {
		const renderLeftDecoration = () => {
			if (leftDecoration) {
				return (
					<div className="absolute inset-y-0 left-0 flex items-center pl-3">{leftDecoration}</div>
				)
			}

			return null
		}

		const renderRightDecoration = () => {
			if (rightDecoration) {
				return (
					<div className="absolute inset-y-0 right-0 flex items-center pr-3">{rightDecoration}</div>
				)
			}

			return null
		}

		return (
			<div
				className={cn(
					'grid w-full items-center gap-1.5',
					{ 'max-w-sm': !fullWidth },
					containerClassName,
				)}
			>
				{label && (
					<Label htmlFor={props.id} {...(labelProps || {})}>
						{label}
						{props.required && <span className="text-red-400"> *</span>}
					</Label>
				)}
				<div className="relative w-full">
					{renderLeftDecoration()}
					<RawInput
						{...props}
						ref={ref}
						isInvalid={!!errorMessage || props.isInvalid}
						className={cn(
							{
								'pl-10': !!leftDecoration,
							},
							className,
						)}
					/>
					{renderRightDecoration()}
				</div>

				{errorMessage && (
					<Text variant="danger" size="xs" className="break-all">
						{errorMessage}
					</Text>
				)}

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
