import { Button, cx, Popover } from '@stump/components'
import { SortAsc } from 'lucide-react'
import React, { useState } from 'react'
import { useMediaMatch } from 'rooks'

import { useFilterContext } from './context'
import { FilterableEntity, OrderByDirection, OrderBySelect } from './form'

type Props = {
	entity: FilterableEntity
}
export default function OrderBy({ entity }: Props) {
	const [isOpen, setIsOpen] = useState(false)
	const isMobile = useMediaMatch('(max-width: 768px)')

	const { filters, ordering, setFilters } = useFilterContext()

	const handleChangeOrderBy = (value: string) =>
		setFilters({
			...filters,
			order_by: value,
		})

	const handleChangeDirection = (value: 'asc' | 'desc') =>
		setFilters({
			...filters,
			direction: value,
		})

	return (
		<Popover onOpenChange={setIsOpen} open={isOpen}>
			<Popover.Trigger asChild>
				<Button
					variant="ghost"
					className={cx('shrink-0', {
						'!bg-background-surface': isOpen,
					})}
				>
					<SortAsc className="mr-1.5 h-4 w-4 text-foreground-subtle" />
					Order By
				</Button>
			</Popover.Trigger>

			<Popover.Content
				className="flex flex-col gap-3 overflow-hidden border-opacity-50 bg-background shadow-sm"
				align={isMobile ? 'start' : 'end'}
			>
				<OrderBySelect entity={entity} value={ordering.order_by} onChange={handleChangeOrderBy} />
				<OrderByDirection value={ordering.direction} onChange={handleChangeDirection} />
			</Popover.Content>
		</Popover>
	)
}
