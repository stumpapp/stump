import { IconButton, Popover } from '@stump/components'
import { ArrowUpDown } from 'lucide-react'
import React, { useState } from 'react'
import { useMediaMatch } from 'rooks'

import { useFilterContext } from '../filters'

export default function BookURLOrdering() {
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
				<IconButton
					variant="ghost"
					size="xs"
					className="hover:bg-background-300"
					pressEffect={false}
				>
					<ArrowUpDown className="h-4 w-4" />
				</IconButton>
			</Popover.Trigger>

			<Popover.Content
				className="flex flex-col gap-3 overflow-hidden border-opacity-50 bg-background-300 shadow-sm"
				align={isMobile ? 'start' : 'end'}
			>
				Content
				{/* <OrderBySelect entity={entity} value={ordering.order_by} onChange={handleChangeOrderBy} />
				<OrderByDirection value={ordering.direction} onChange={handleChangeDirection} /> */}
			</Popover.Content>
		</Popover>
	)
}
