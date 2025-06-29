import type { ComponentPropsWithoutRef } from 'react'
import { forwardRef } from 'react'

import { Label } from '../form'
import { Text } from '../text'
import { cn } from '../utils'
import { RawInput, RawInputProps } from './raw'

// TODO: size prop
export type InputProps = {
	/** The label for the input. */
	label?: string
	/** The optional props for the label. */
	labelProps?: Omit<ComponentPropsWithoutRef<typeof Label>, 'children'>
	/** The optional description for the input. */
	description?: string
	/** The optional position for the description. */
	descriptionPosition?: 'top' | 'bottom'
	/** The optional props for the description. */
	descriptionProps?: Omit<ComponentPropsWithoutRef<typeof Text>, 'children'>
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

export const Input = forwardRef<HTMLInputElement, InputProps>(
	(
		{
			label,
			description,
			descriptionPosition = 'bottom',
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

		const renderDescription = () => {
			if (description) {
				return (
					<Text
						variant="muted"
						size="sm"
						{...(descriptionProps || {})}
						className={cn(
							{
								'cursor-not-allowed text-opacity-50': props.disabled,
							},
							descriptionProps?.className,
						)}
					>
						{description}
					</Text>
				)
			}

			return null
		}

		const renderBottom = () => {
			if (errorMessage) {
				return (
					<Text variant="danger" size="xs" className="break-all">
						{errorMessage}
					</Text>
				)
			} else if (bottomDescription) {
				return renderDescription()
			} else {
				return null
			}
		}

		const topDescription = description && descriptionPosition === 'top'
		const bottomDescription = description && descriptionPosition === 'bottom'

		return (
			<div
				className={cn(
					'grid w-full items-center gap-2',
					{ 'max-w-sm': !fullWidth },
					containerClassName,
				)}
			>
				{label && (
					<Label
						htmlFor={props.id}
						{...(labelProps || {})}
						className={cn(
							{
								'cursor-not-allowed text-opacity-50': props.disabled,
							},
							labelProps?.className,
						)}
					>
						{label}
						{props.required && <span className="text-red-400"> *</span>}
					</Label>
				)}

				{topDescription && renderDescription()}

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
						data-testid={props.id}
					/>
					{renderRightDecoration()}
				</div>

				{renderBottom()}
			</div>
		)
	},
)
Input.displayName = 'Input'
