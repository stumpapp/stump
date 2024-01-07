import { cn } from '@stump/components'
import { ArrowDown, ArrowUpDown } from 'lucide-react'

export default function SortIcon({ direction }: { direction: 'asc' | 'desc' | null }) {
	const classes = 'h-3.5 w-3.5 text-muted shrink-0'

	if (!direction) {
		return <ArrowUpDown className={classes} />
	}

	return (
		<ArrowDown
			className={cn('transition-transform duration-200', classes, {
				'rotate-180': direction === 'asc',
			})}
		/>
	)
}
