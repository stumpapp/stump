import { IconButton, Popover, ToolTip } from '@stump/components'
import { MediaModelOrdering, MediaOrderBy, OrderDirection } from '@stump/graphql'
import { ArrowUpDown } from 'lucide-react'
import { useCallback, useMemo, useState } from 'react'
import { useMediaMatch } from 'rooks'

import { OrderByDirection, OrderBySelect } from './form'

type Props = {
	sortableFields: MediaModelOrdering[]
	orderBy: MediaOrderBy[]
	setOrderBy: (orderBy: MediaOrderBy[]) => void
}

export default function URLMediaOrderBy({ sortableFields, orderBy, setOrderBy }: Props) {
	const [isOpen, setIsOpen] = useState(false)
	const isMobile = useMediaMatch('(max-width: 768px)')
	const direction = useMemo(() => orderBy[0]?.media?.direction ?? OrderDirection.Asc, [orderBy])
	const orderByField = useMemo(() => orderBy[0]?.media?.field ?? MediaModelOrdering.Name, [orderBy])
	const sortableFieldsStrs = useMemo(
		() => sortableFields.map((f) => f.toString().toLowerCase()),
		[sortableFields],
	)

	/**
	 * A callback to handle the change of the ordering field.
	 */
	const handleChangeOrderBy = useCallback(
		(value: string) => {
			const field = sortableFields.find((f) => f === (value.toUpperCase() as MediaModelOrdering))
			if (!field) return
			setOrderBy([{ media: { field, direction } }])
		},
		[setOrderBy, direction, sortableFields],
	)

	/**
	 * A callback to handle the change of the ordering direction.
	 *
	 * @param value The new ordering direction.
	 */
	const handleChangeDirection = useCallback(
		(value: string) => {
			const newDirection = value as OrderDirection
			if (!newDirection) return

			setOrderBy([{ media: { field: orderByField, direction: newDirection } }])
		},
		[setOrderBy, orderByField],
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
				<OrderBySelect
					sortableFields={sortableFieldsStrs}
					value={orderByField.toString().toLowerCase()}
					onChange={handleChangeOrderBy}
				/>
				<OrderByDirection value={direction} onChange={handleChangeDirection} />
			</Popover.Content>
		</Popover>
	)
}
