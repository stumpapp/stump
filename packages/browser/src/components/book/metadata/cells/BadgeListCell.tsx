import { Badge, cn } from '@stump/components'

type Props = {
	values?: string[]
	onItemClick?: (index: number) => void
}

export default function BadgeListCell({ values, onItemClick }: Props) {
	return (
		<div className="flex h-full flex-wrap gap-1">
			{values?.map((value, index) => (
				<Badge
					key={value}
					onClick={() => onItemClick?.(index)}
					className={cn({
						'cursor-pointer': onItemClick,
					})}
				>
					{value}
				</Badge>
			))}
		</div>
	)
}
