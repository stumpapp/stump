import { cn } from '@stump/components'
import { ArrowDown, ArrowUpDown } from 'lucide-react'

type Props = {
	direction: 'asc' | 'desc' | null
	showIfNull?: boolean
}
export default function SortIcon({ direction, showIfNull }: Props) {
	const classes = 'h-3.5 w-3.5 text-foreground-muted shrink-0'

	if (!direction) {
		return showIfNull ? <ArrowUpDown className={classes} /> : null
	}

	return (
		<ArrowDown
			className={cn('transition-transform duration-200', classes, {
				'rotate-180': direction === 'asc',
			})}
		/>
	)
}
