import { Button, cx } from '@stump/components'
import { SortAsc } from 'lucide-react'
import React from 'react'

type Direction = 'asc' | 'desc'
type Props = {
	value?: Direction
	onChange: (value: Direction) => void
}
export default function OrderByDirection({ value, onChange }: Props) {
	return (
		<Button
			variant="ghost"
			className="justify-start"
			onClick={() => onChange(value === 'desc' ? 'asc' : 'desc')}
		>
			<SortAsc
				className={cx('mr-1.5 h-4 w-4 text-foreground-muted transition-all', {
					'rotate-180': value === 'desc',
				})}
			/>
			{value === 'desc' ? 'Descending' : 'Ascending'}
		</Button>
	)
}
