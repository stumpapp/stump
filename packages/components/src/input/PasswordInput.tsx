import { Eye, EyeOff } from 'lucide-react'
import { forwardRef, useState } from 'react'

import { Label } from '../form'
import { Text } from '../text'
import { cn } from '../utils'
import { InputProps } from './Input'
import { InputGroup } from './input-group'

export const PasswordInput = forwardRef<HTMLInputElement, InputProps>(
	(
		{
			label,
			description,
			descriptionPosition = 'bottom',
			labelProps,
			descriptionProps,
			fullWidth,
			containerClassName,
			errorMessage,
			className,
			...props
		},
		ref,
	) => {
		const [showPassword, setShowPassword] = useState(false)

		const resolvedInvalid = props.isInvalid ?? !!errorMessage

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

		const topDescription = description && descriptionPosition === 'top'
		const bottomDescription = description && descriptionPosition === 'bottom'

		const renderBottom = () => {
			if (errorMessage) {
				return (
					<Text variant="danger" size="xs" className="break-all">
						{errorMessage}
					</Text>
				)
			} else if (bottomDescription) {
				return renderDescription()
			}

			return null
		}

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

				<InputGroup>
					<InputGroup.Input
						{...props}
						ref={ref}
						type={showPassword ? 'text' : 'password'}
						aria-invalid={resolvedInvalid}
						className={className}
						data-testid={props.id}
					/>

					<InputGroup.Addon align="inline-end">
						<InputGroup.Button
							title={showPassword ? 'Hide password' : 'Show password'}
							type="button"
							variant="ghost"
							size="icon-xs"
							onClick={() => setShowPassword((prev) => !prev)}
						>
							{showPassword ? (
								<Eye className="h-4 w-4 text-muted-foreground" />
							) : (
								<EyeOff className="h-4 w-4 text-muted-foreground" />
							)}
						</InputGroup.Button>
					</InputGroup.Addon>
				</InputGroup>

				{renderBottom()}
			</div>
		)
	},
)
PasswordInput.displayName = 'PasswordInput'
