import { cn, Text } from '@stump/components'
import { cva, VariantProps } from 'class-variance-authority'
import { Check } from 'lucide-react'
import type { ReactNode } from 'react'

const tile = cva(
	[
		'group gap-1 flex flex-col',
		'p-1 rounded-md border border-border/70 bg-muted/50 text-left transition-[color,background-color,border-color,opacity] duration-150',
		'hover:border-border hover:bg-muted/80',
		'focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none',
	],
	{
		variants: {
			columns: {
				2: 'w-34',
				3: 'w-28',
				4: 'w-24',
			},
		},
	},
)

export type RadioTileOption<T extends string | number> = {
	label: string
	value: T
	preview: ReactNode
}

export type RadioTileGroupProps<T extends string | number> = {
	options: RadioTileOption<T>[]
	value: T
	onChange: (value: T) => void | Promise<void>
	className?: string
	columns?: VariantProps<typeof tile>['columns']
}

export default function RadioTileGroup<T extends string | number>({
	options,
	value,
	onChange,
	className,
	columns = 4,
}: RadioTileGroupProps<T>) {
	return (
		<div className={cn('gap-2 lg:ml-auto flex flex-wrap justify-end', className)} role="radiogroup">
			{options.map((option) => {
				const isSelected = option.value === value

				return (
					<button
						key={String(option.value)}
						type="button"
						role="radio"
						aria-checked={isSelected}
						onClick={() => onChange(option.value)}
						className={cn(
							tile({ columns }),
							isSelected &&
								'border-primary bg-muted/85 ring-1 ring-primary/70 hover:border-primary hover:bg-muted/90 hover:ring-primary/80',
						)}
					>
						<div className="h-14 p-1.5 relative w-full overflow-hidden rounded-sm border border-sidebar/65 bg-sidebar/30">
							{option.preview}
							{isSelected && (
								<div className="bottom-1 right-1 h-4 w-4 absolute flex items-center justify-center rounded-full bg-primary">
									<Check className="h-3 w-3 text-primary-foreground" />
								</div>
							)}
						</div>
						<Text size="xs" className="px-0.5 font-semibold line-clamp-1 text-center">
							{option.label}
						</Text>
					</button>
				)
			})}
		</div>
	)
}
