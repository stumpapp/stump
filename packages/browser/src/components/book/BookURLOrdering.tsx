import { IconButton, Popover, ToolTip } from '@stump/components'
import { ArrowUpDown } from 'lucide-react'
import React, { useCallback, useState } from 'react'
import { useMediaMatch } from 'rooks'

import { useFilterContext } from '../filters'
import { OrderByDirection, OrderBySelect } from '../filters/form'

export default function BookURLOrdering() {
	const [isOpen, setIsOpen] = useState(false)
	const isMobile = useMediaMatch('(max-width: 768px)')

	const { filters, ordering, setFilters, setFilter } = useFilterContext()

	const handleChangeOrderBy = useCallback(
		(value: string) => setFilter('order_by', value),
		[setFilter],
	)

	const handleChangeDirection = useCallback(
		(value: 'asc' | 'desc') =>
			setFilters({
				...filters,
				direction: value,
			}),
		[filters, setFilters],
	)

	return (
		<Popover onOpenChange={setIsOpen} open={isOpen}>
			<ToolTip content="Configure ordering" size="sm" isDisabled={isOpen}>
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
			</ToolTip>

			<Popover.Content
				className="flex flex-col gap-3 overflow-hidden p-3 shadow-sm"
				align={isMobile ? 'start' : 'end'}
			>
				<OrderBySelect
					entity="media"
					value={ordering.order_by || 'name'}
					onChange={handleChangeOrderBy}
				/>
				<OrderByDirection value={ordering.direction} onChange={handleChangeDirection} />
			</Popover.Content>
		</Popover>
	)
}
