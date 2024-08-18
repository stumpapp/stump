import {
	closestCenter,
	DndContext,
	DragEndEvent,
	KeyboardSensor,
	PointerSensor,
	useSensor,
	useSensors,
} from '@dnd-kit/core'
import {
	arrayMove,
	rectSortingStrategy,
	SortableContext,
	sortableKeyboardCoordinates,
	useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Button, IconButton, Sheet, Text, ToolTip } from '@stump/components'
import { useLocaleContext } from '@stump/i18n'
import { ReactTableColumnSort } from '@stump/types'
import { Columns, Eye, EyeOff } from 'lucide-react'
import React, { useCallback, useMemo, useState } from 'react'
import { useMediaMatch } from 'rooks'

import { bookTableColumnMap } from '../book/table'

type Props = {
	entity: 'media' | 'series' | 'library'
	configuration: ReactTableColumnSort[]
	onSave: (columns: ReactTableColumnSort[]) => void
}

export default function EntityTableColumnConfiguration({ entity, configuration, onSave }: Props) {
	const { t } = useLocaleContext()

	const [isOpen, setIsOpen] = useState(false)

	const isMobile = useMediaMatch('(max-width: 768px)')
	const sensors = useSensors(
		useSensor(PointerSensor, {
			activationConstraint: {
				// Require pointer to move by 5 pixels before activating draggable
				// Allows nested onClicks/buttons/interactions to be accessed
				distance: 5,
			},
		}),
		useSensor(KeyboardSensor, {
			coordinateGetter: sortableKeyboardCoordinates,
		}),
	)

	const columnMap = useMemo(() => {
		if (entity === 'media') {
			return bookTableColumnMap
		}

		return {}
	}, [entity])

	const [fullConfiguration, setFullConfiguration] = useState(() =>
		resolveConfiguration(configuration, columnMap),
	)

	/**
	 * A callback to toggle the selected state of a column. If saved, the column will be displayed
	 * according to the boolean value of selected.
	 *
	 * @param id The ID of the column to toggle
	 */
	const handleChangeSelected = (id: string) =>
		setFullConfiguration((prev) =>
			prev.map((column) => {
				if (column.id === id) {
					return {
						...column,
						selected: !column.selected,
					}
				}
				return column
			}),
		)

	/**
	 * A callback to persist the current local state to the parent component.
	 */
	const handleSave = useCallback(() => {
		const onlySelected = fullConfiguration
			.filter((column) => column.selected)
			.map(({ id }, idx) => ({
				id,
				position: idx,
			}))
		onSave(onlySelected)
		setIsOpen(false)
	}, [fullConfiguration, onSave])

	/**
	 * A callback to handle the end of a drag event. If the column is dragged over another column,
	 * the columns will be re-ordered according to the new position.
	 */
	const handleDragEnd = (event: DragEndEvent) => {
		const { active, over } = event

		if (!!over?.id && active.id !== over.id) {
			setFullConfiguration((prev) => {
				const oldIndex = prev.findIndex((column) => column.id === active.id)
				const newIndex = prev.findIndex((column) => column.id === over.id)
				return arrayMove(prev, oldIndex, newIndex)
			})
		}
	}

	/**
	 * The IDs of all columns in the current configuration, used for sorting and re-ordering.
	 */
	const identifiers = useMemo(
		() => fullConfiguration.map((column) => column.id),
		[fullConfiguration],
	)

	return (
		<Sheet
			title="Configure columns"
			description="Adjust which columns are displayed in book-exploration tables"
			open={isOpen}
			onClose={() => setIsOpen(false)}
			onOpen={() => setIsOpen(true)}
			trigger={
				<ToolTip content="Configure columns" size="sm" align="start">
					<IconButton size="xs" variant="ghost" pressEffect={false} onClick={() => setIsOpen(true)}>
						<Columns className="h-4 w-4" />
					</IconButton>
				</ToolTip>
			}
			size={isMobile ? 'xl' : 'lg'}
			footer={
				<div className="-mt-4 flex w-full items-center gap-x-4 py-2">
					<Button className="w-full" onClick={handleSave}>
						{t('common.save')}
					</Button>
					<Button
						variant="outline"
						className="w-full"
						onClick={() => {
							setFullConfiguration(resolveConfiguration(configuration, columnMap))
							setIsOpen(false)
						}}
					>
						{t('common.cancel')}
					</Button>
				</div>
			}
		>
			<div className="flex-1">
				<DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
					<SortableContext items={identifiers} strategy={rectSortingStrategy}>
						<div className="grid grid-cols-2 gap-x-2 gap-y-4 p-4 md:grid-cols-4">
							{fullConfiguration.map((column) => (
								<DraggableColumn
									column={column}
									key={column.id}
									toggleSelected={() => handleChangeSelected(column.id)}
								/>
							))}
						</div>
					</SortableContext>
				</DndContext>
			</div>
		</Sheet>
	)
}

const resolveConfiguration = (
	configuration: ReactTableColumnSort[],
	columnMap: Record<string, string>,
) =>
	Object.entries(columnMap)
		.map(([key, label], idx) => {
			const configPosition = configuration.findIndex((column) => column.id === key)
			return {
				id: key,
				label,
				position: configPosition === -1 ? configuration.length + idx : configPosition,
				selected: configPosition !== -1,
			}
		})
		.sort((a, b) => a.position - b.position)

type DraggableColumnProps = {
	column: ReturnType<typeof resolveConfiguration>[number]
	toggleSelected: () => void
	disabled?: boolean
}
function DraggableColumn({ column, toggleSelected }: DraggableColumnProps) {
	const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
		id: column.id,
		transition: {
			duration: 250,
			easing: 'cubic-bezier(0.25, 1, 0.5, 1)',
		},
	})

	const style = {
		transform: CSS.Transform.toString(transform),
		transition,
	}

	const VisibilityIcon = column.selected ? Eye : EyeOff

	return (
		<div
			ref={setNodeRef}
			style={style}
			{...attributes}
			{...listeners}
			className="flex shrink-0 items-center justify-between rounded-md border border-edge bg-background-surface px-2 py-1"
		>
			<Text size="sm">{column.label}</Text>
			<IconButton
				size="xs"
				title={column.id === 'name' ? 'Cannot hide name column' : 'Toggle visibility'}
				disabled={column.id === 'name'}
				onClick={toggleSelected}
			>
				<VisibilityIcon className="h-4 w-4" />
			</IconButton>
		</div>
	)
}
