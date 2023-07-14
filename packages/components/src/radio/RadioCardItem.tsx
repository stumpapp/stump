import { Label } from '../form'
import { Text } from '../text'
import { cn, cx } from '../utils'
import { RadioGroup } from './primitives'

type RadioCardProps = {
	label: string
	description?: string
	descriptionClassName?: string
	value: string
	isActive: boolean
	children?: React.ReactNode
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
	innerContainerClassName,
	radioContainerClassName,
}: RadioCardProps) {
	return (
		<div
			className={cx(
				'relative rounded-lg border px-6 py-4 shadow-sm focus:outline-none',
				{
					'border-brand-400 ring-2 ring-brand-400': isActive,
				},
				{
					'border-gray-150 border-opacity-70 hover:border-opacity-100 dark:border-gray-800 dark:border-opacity-70 dark:hover:border-opacity-100':
						!isActive,
				},
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
					<RadioGroup.Item value={value} id={value} />
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
