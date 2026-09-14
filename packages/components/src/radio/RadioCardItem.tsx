import { Label } from '../form'
import { Text } from '../text'
import { cn } from '../utils'
import { useRadioGroupContext } from './context'
import { RadioGroup } from './primitives'

type RadioCardProps = {
	label: string
	description?: string
	descriptionClassName?: string
	value: string
	isActive?: boolean
	children?: React.ReactNode
	className?: string
	innerContainerClassName?: string
	radioContainerClassName?: string
}

/**
 * A radio item component that is wrapped in a card-like container.
 */
export function RadioCardItem({
	label,
	description,
	descriptionClassName,
	value,
	isActive,
	children,
	className,
	innerContainerClassName,
	radioContainerClassName,
}: RadioCardProps) {
	const { disabled } = useRadioGroupContext()

	return (
		<Label
			htmlFor={value}
			className={cn(
				'p-4 font-normal relative cursor-pointer rounded-lg border bg-card transition-colors duration-150 focus:outline-none',
				disabled ? 'cursor-not-allowed opacity-70' : 'hover:bg-accent/50',
				{
					'border-primary ring-2 ring-ring': isActive,
				},
				{ 'hover:bg-accent': isActive && !disabled },
				{
					'border-opacity-70 hover:border-opacity-100 border-border': !isActive,
				},
				className,
			)}
		>
			<div
				className={cn(
					'sm:flex sm:items-center sm:justify-between block',
					{ 'pb-4': !!children },
					innerContainerClassName,
				)}
			>
				<div className={cn('space-x-2 flex shrink-0 items-center', radioContainerClassName)}>
					<RadioGroup.Item value={value} id={value} className="border-border" />
					<Text variant="label" className="font-normal">
						{label}
					</Text>
				</div>
				{description && (
					<Text
						variant="muted"
						size="sm"
						className={cn('mt-2 font-normal sm:mt-0', descriptionClassName)}
					>
						{description}
					</Text>
				)}
			</div>

			{children}
		</Label>
	)
}
