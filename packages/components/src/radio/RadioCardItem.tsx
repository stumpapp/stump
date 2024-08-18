import { Label } from '../form'
import { Text } from '../text'
import { cn } from '../utils'
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
	return (
		<div
			className={cn(
				'relative rounded-lg border bg-background-surface px-6 py-4 shadow-sm transition-colors duration-150 hover:bg-background-surface-hover/70 focus:outline-none',
				{
					'border-brand-400 bg-background-surface/75 ring-2 ring-brand-400 hover:bg-background-surface-hover':
						isActive,
				},
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
					<Label htmlFor={value}>{label}</Label>
				</div>
				{description && (
					<Text variant="muted" size="sm" className={cn('mt-2 sm:mt-0', descriptionClassName)}>
						{description}
					</Text>
				)}
			</div>

			{children}
		</div>
	)
}
