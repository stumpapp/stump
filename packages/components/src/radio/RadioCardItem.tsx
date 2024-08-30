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
	isActive: boolean
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
				'relative cursor-pointer rounded-lg border bg-background-surface px-6 py-4 font-normal shadow-sm transition-colors duration-150 focus:outline-none',
				disabled ? 'cursor-not-allowed opacity-70' : 'hover:bg-background-surface-hover/70',
				{
					'border-brand-400 bg-background-surface/75 ring-2 ring-brand-400': isActive,
				},
				{ 'hover:bg-background-surface-hover': isActive && !disabled },
				{
					'border-edge-subtle border-opacity-70 hover:border-opacity-100': !isActive,
				},
				className,
			)}
		>
			<div
				className={cn(
					'block sm:flex sm:items-center sm:justify-between',
					{ 'pb-4': !!children },
					innerContainerClassName,
				)}
			>
				<div className={cn('flex flex-shrink-0 items-center space-x-2', radioContainerClassName)}>
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
