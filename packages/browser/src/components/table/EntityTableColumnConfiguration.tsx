import {
	closestCenter,
	DndContext,
	DragEndEvent,
	DragOverEvent,
	DragOverlay,
	DragStartEvent,
	KeyboardSensor,
	PointerSensor,
	useDroppable,
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
import { ColumnSort } from '@stump/sdk'
import partition from 'lodash/partition'
import { Columns, Eye, EyeOff } from 'lucide-react'
import { useCallback, useMemo, useState } from 'react'
import { useMediaMatch } from 'rooks'

import { bookTableColumnMap } from '../book/table'

type Props = {
	entity: 'media' | 'series' | 'library'
	configuration: ColumnSort[]
	onSave: (columns: ColumnSort[]) => void
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

	const resolved = useMemo(
		() => resolveConfiguration(configuration, columnMap),
		[configuration, columnMap],
	)

	const toBuckets = (columns: ResolvedColumn[]): [ResolvedColumn[], ResolvedColumn[]] =>
		partition(columns, (column) => column.selected)

	const [[visible, hidden], setBuckets] = useState(() => toBuckets(resolved))
	const [activeColumnId, setActiveColumnId] = useState<string | null>(null)

	const allColumns = useMemo(() => [...visible, ...hidden], [visible, hidden])
	const activeColumn = useMemo(
		() => allColumns.find((column) => column.id === activeColumnId) ?? null,
		[allColumns, activeColumnId],
	)

	/**
	 * Moves a column into either visible or hidden list
	 */
	const handleMoveColumn = (id: string, toVisible: boolean) => {
		setBuckets((prev) => {
			const [prevVisible, prevHidden] = prev
			const source = toVisible ? prevHidden : prevVisible
			const destination = toVisible ? prevVisible : prevHidden
			const moved = source.find((column) => column.id === id)

			if (!moved) {
				return prev
			}

			const updatedSource = source.filter((column) => column.id !== id)
			const updatedDestination = [...destination, { ...moved, selected: toVisible }]

			return toVisible ? [updatedDestination, updatedSource] : [updatedSource, updatedDestination]
		})
	}

	/**
	 * A callback to persist the current local state to the parent component.
	 */
	const handleSave = useCallback(() => {
		const onlySelected = visible.map(({ id }, idx) => ({
			id,
			position: idx,
		}))
		setIsOpen(false)
		// Note: I did this to push to end of event loop so animation isn't interrupted
		setTimeout(() => onSave(onlySelected))
	}, [visible, onSave])

	/**
	 * A callback to handle the end of a drag event. If the column is dragged over another column,
	 * the columns will be re-ordered according to the new position.
	 */
	const handleDragEnd = (event: DragEndEvent) => {
		setActiveColumnId(null)
		const { active, over } = event
		if (!over?.id) return

		const activeId = String(active.id)
		const overId = String(over.id)

		const findContainer = (id: string): 'visible' | 'hidden' | null => {
			if (id === 'visible-container') return 'visible'
			if (id === 'hidden-container') return 'hidden'
			if (visible.some((column) => column.id === id)) return 'visible'
			if (hidden.some((column) => column.id === id)) return 'hidden'
			return null
		}

		const sourceContainer = findContainer(activeId)
		const destinationContainer = findContainer(overId)

		if (!sourceContainer || !destinationContainer) return

		if (sourceContainer === destinationContainer) {
			setBuckets((prev) => {
				const [prevVisible, prevHidden] = prev
				const source = sourceContainer === 'visible' ? prevVisible : prevHidden
				const oldIndex = source.findIndex((column) => column.id === activeId)
				const newIndex =
					overId === `${sourceContainer}-container`
						? source.length - 1
						: source.findIndex((column) => column.id === overId)

				if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) {
					return prev
				}

				const moved = arrayMove(source, oldIndex, newIndex)
				return sourceContainer === 'visible' ? [moved, prevHidden] : [prevVisible, moved]
			})
		} else {
			setBuckets((prev) => {
				const [prevVisible, prevHidden] = prev
				const sourceList = sourceContainer === 'visible' ? prevVisible : prevHidden
				const destinationList = destinationContainer === 'visible' ? prevVisible : prevHidden

				const sourceIndex = sourceList.findIndex((column) => column.id === activeId)
				if (sourceIndex === -1) return prev

				const movedColumn = sourceList[sourceIndex]
				if (!movedColumn) return prev

				const source = sourceList.filter((column) => column.id !== activeId)
				const destination = [...destinationList]

				const destinationIndex =
					overId === `${destinationContainer}-container`
						? destination.length
						: destination.findIndex((column) => column.id === overId)

				if (destinationIndex === -1) {
					destination.push({
						...movedColumn,
						selected: destinationContainer === 'visible',
					})
				} else {
					destination.splice(destinationIndex, 0, {
						...movedColumn,
						selected: destinationContainer === 'visible',
					})
				}

				return destinationContainer === 'visible' ? [destination, source] : [source, destination]
			})
		}
	}

	const handleDragOver = (event: DragOverEvent) => {
		const { active, over } = event
		if (!over?.id) return

		const activeId = String(active.id)
		const overId = String(over.id)

		setBuckets((prev) => {
			const [prevVisible, prevHidden] = prev
			const findContainer = (id: string): 'visible' | 'hidden' | null => {
				if (id === 'visible-container') return 'visible'
				if (id === 'hidden-container') return 'hidden'
				if (prevVisible.some((column) => column.id === id)) return 'visible'
				if (prevHidden.some((column) => column.id === id)) return 'hidden'
				return null
			}

			const sourceContainer = findContainer(activeId)
			const destinationContainer = findContainer(overId)

			if (!sourceContainer || !destinationContainer || sourceContainer === destinationContainer) {
				return prev
			}

			const sourceList = sourceContainer === 'visible' ? prevVisible : prevHidden
			const destinationList = destinationContainer === 'visible' ? prevVisible : prevHidden

			const sourceIndex = sourceList.findIndex((column) => column.id === activeId)
			if (sourceIndex === -1) return prev

			const movedColumn = sourceList[sourceIndex]
			if (!movedColumn) return prev

			const source = sourceList.filter((column) => column.id !== activeId)
			const destination = [...destinationList]

			const destinationIndex =
				overId === `${destinationContainer}-container`
					? destination.length
					: destination.findIndex((column) => column.id === overId)

			const moved = {
				...movedColumn,
				selected: destinationContainer === 'visible',
			}

			if (destinationIndex === -1) {
				destination.push(moved)
			} else {
				destination.splice(destinationIndex, 0, moved)
			}

			return destinationContainer === 'visible' ? [destination, source] : [source, destination]
		})
	}

	const handleDragStart = ({ active }: DragStartEvent) => setActiveColumnId(String(active.id))

	const handleDragCancel = () => {
		setActiveColumnId(null)
	}

	/**
	 * The IDs of all columns in the current configuration, used for sorting and re-ordering.
	 */
	const visibleIdentifiers = useMemo(() => visible.map((column) => column.id), [visible])
	const hiddenIdentifiers = useMemo(() => hidden.map((column) => column.id), [hidden])

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
							setBuckets(toBuckets(resolveConfiguration(configuration, columnMap)))
							setIsOpen(false)
						}}
					>
						{t('common.cancel')}
					</Button>
				</div>
			}
		>
			<div className="flex-1">
				<DndContext
					sensors={sensors}
					collisionDetection={closestCenter}
					onDragStart={handleDragStart}
					onDragOver={handleDragOver}
					onDragCancel={handleDragCancel}
					onDragEnd={handleDragEnd}
				>
					<div className="grid grid-cols-1 gap-3 p-4 md:grid-cols-2">
						<ColumnBucket
							title="Visible"
							containerId="visible-container"
							items={visible}
							identifiers={visibleIdentifiers}
							onMoveToOtherList={(id) => handleMoveColumn(id, false)}
						/>
						<ColumnBucket
							title="Hidden"
							containerId="hidden-container"
							items={hidden}
							identifiers={hiddenIdentifiers}
							onMoveToOtherList={(id) => handleMoveColumn(id, true)}
						/>
					</div>
					<DragOverlay>{activeColumn && <ColumnOverlay column={activeColumn} />}</DragOverlay>
				</DndContext>
			</div>
		</Sheet>
	)
}

const resolveConfiguration = (configuration: ColumnSort[], columnMap: Record<string, string>) =>
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

type ResolvedColumn = ReturnType<typeof resolveConfiguration>[number]

type DraggableColumnProps = {
	column: ResolvedColumn
	moveToOtherList: () => void
	buttonLabel: string
	disabled?: boolean
}
function DraggableColumn({ column, moveToOtherList, buttonLabel }: DraggableColumnProps) {
	const { attributes, isDragging, listeners, setNodeRef, transform, transition } = useSortable({
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
			className={`flex shrink-0 items-center justify-between rounded-md border border-edge bg-background-surface px-2 py-1 ${
				isDragging ? 'opacity-40' : ''
			}`}
		>
			<Text size="sm">{column.label}</Text>
			<IconButton size="xs" title={buttonLabel} onClick={moveToOtherList}>
				<VisibilityIcon className="h-4 w-4" />
			</IconButton>
		</div>
	)
}

function ColumnOverlay({ column }: { column: ReturnType<typeof resolveConfiguration>[number] }) {
	return (
		<div className="flex min-w-40 items-center justify-between rounded-md border border-edge bg-background-surface px-2 py-1 shadow-sm">
			<Text size="sm">{column.label}</Text>
		</div>
	)
}

type ColumnBucketProps = {
	title: string
	containerId: string
	items: ReturnType<typeof resolveConfiguration>
	identifiers: string[]
	onMoveToOtherList: (id: string) => void
}

function ColumnBucket({
	title,
	containerId,
	items,
	identifiers,
	onMoveToOtherList,
}: ColumnBucketProps) {
	const { setNodeRef } = useDroppable({ id: containerId })
	const moveLabel = title === 'Visible' ? 'Move to hidden' : 'Move to visible'

	return (
		<div ref={setNodeRef} className="rounded-md border border-edge bg-background p-3">
			<div className="mb-2 flex items-center justify-between">
				<Text size="sm" variant="secondary">
					{title}
				</Text>
				<Text size="xs" variant="muted">
					{items.length}
				</Text>
			</div>

			<SortableContext items={identifiers} strategy={rectSortingStrategy}>
				<div className="flex min-h-20 flex-col gap-2">
					{items.map((column) => (
						<DraggableColumn
							column={column}
							key={column.id}
							moveToOtherList={() => onMoveToOtherList(column.id)}
							buttonLabel={moveLabel}
						/>
					))}
					{items.length === 0 && (
						<div className="flex min-h-10 items-center justify-center rounded border border-dashed border-edge px-2 py-3">
							<Text size="xs" variant="muted">
								Drop columns here
							</Text>
						</div>
					)}
				</div>
			</SortableContext>
		</div>
	)
}
