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
				'rounded-lg p-4 font-normal relative cursor-pointer border bg-background-surface transition-colors duration-150 focus:outline-none',
				disabled ? 'cursor-not-allowed opacity-70' : 'hover:bg-background-surface-hover/70',
				{
					'border-edge-brand bg-background-surface/75 ring-2 ring-edge-brand': isActive,
				},
				{ 'hover:bg-background-surface-hover': isActive && !disabled },
				{
					'border-opacity-70 hover:border-opacity-100 border-edge-subtle': !isActive,
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
					<RadioGroup.Item value={value} id={value} className="border-edge-subtle" />
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
