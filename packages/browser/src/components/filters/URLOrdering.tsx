import { IconButton, Popover, ToolTip } from '@stump/components'
import { OrderDirection } from '@stump/graphql'
import { ArrowUpDown } from 'lucide-react'
import { useCallback, useState } from 'react'
import { useMediaMatch } from 'rooks'

import { OrderingField, useFilterContext } from './context'
import { FilterableEntity, OrderByDirection, OrderBySelect } from './form'

type Props = {
	entity: FilterableEntity
}

export default function URLOrdering({ entity }: Props) {
	const [isOpen, setIsOpen] = useState(false)
	const isMobile = useMediaMatch('(max-width: 768px)')
	const {
		ordering: { orderBy, direction },
		setOrdering,
	} = useFilterContext()

	/**
	 * A callback to handle the change of the ordering field.
	 */
	const handleChangeOrderBy = useCallback(
		(value: OrderingField) =>
			setOrdering({ orderBy: value, direction: direction ? direction : OrderDirection.Asc }),
		[setOrdering, direction],
	)

	/**
	 * A callback to handle the change of the ordering direction.
	 *
	 * @param value The new ordering direction.
	 */
	const handleChangeDirection = useCallback(
		(value: OrderDirection) =>
			setOrdering({ orderBy: orderBy ? orderBy : ('NAME' as OrderingField), direction: value }),
		[setOrdering, orderBy],
	)

	return (
		<Popover onOpenChange={setIsOpen} open={isOpen}>
			<ToolTip content="Configure ordering" size="sm" isDisabled={isOpen}>
				<Popover.Trigger asChild>
					<IconButton
						variant="ghost"
						size="xs"
						className="hover:bg-background-surface-hover"
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
				<OrderBySelect entity={entity} value={orderBy || 'name'} onChange={handleChangeOrderBy} />
				<OrderByDirection value={direction} onChange={handleChangeDirection} />
			</Popover.Content>
		</Popover>
	)
}
