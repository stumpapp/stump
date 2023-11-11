import { Button, cx } from '@stump/components'
import { SortAsc } from 'lucide-react'
import React from 'react'

import { useFilterContext } from '../context'

type Direction = 'asc' | 'desc'
type Props = {
	value?: Direction
	onChange: (value: Direction) => void
}
export default function OrderByDirection({ value, onChange }: Props) {
	const { ordering } = useFilterContext()
	return (
		<Button
			variant="ghost"
			className="justify-start"
			onClick={() => onChange(value === 'asc' ? 'desc' : 'asc')}
			disabled={!ordering.order_by}
		>
			<SortAsc
				className={cx('mr-1.5 h-4 w-4 transition-all dark:text-gray-400', {
					'rotate-180': value === 'desc',
				})}
			/>
			{value === 'asc' ? 'Ascending' : 'Descending'}
		</Button>
	)
}
