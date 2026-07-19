import type { ComponentPropsWithoutRef } from 'react'
import { forwardRef } from 'react'

import { Label } from '../form'
import { Text } from '../text'
import { cn } from '../utils'
import { RawInput, RawInputProps } from './raw'

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
	/** Whether the input should take up the full container width. */
	fullWidth?: boolean
	/** The optional invalid state. */
	isInvalid?: boolean
	/** The optional error message to display. */
	errorMessage?: string
	/** The optional class name for the container. */
	containerClassName?: string
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
			isInvalid,
			containerClassName,
			errorMessage,
			className,
			...props
		},
		ref,
	) => {
		const resolvedInvalid = isInvalid ?? !!errorMessage

		const renderDescription = () => {
			if (description) {
				return (
					<Text
						variant="muted"
						size="sm"
						{...(descriptionProps || {})}
						className={cn(
							{
								'cursor-not-allowed opacity-50': props.disabled,
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
					'gap-2 grid w-full items-center',
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
								'cursor-not-allowed opacity-50': props.disabled,
							},
							labelProps?.className,
						)}
					>
						{label}
						{props.required && <span className="text-destructive"> *</span>}
					</Label>
				)}

				{topDescription && renderDescription()}

				<div className="relative w-full">
					<RawInput
						{...props}
						ref={ref}
						aria-invalid={resolvedInvalid}
						className={className}
						data-testid={props.id}
					/>
				</div>

				{renderBottom()}
			</div>
		)
	},
)
Input.displayName = 'Input'
