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
	SortableContext,
	sortableKeyboardCoordinates,
	verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { useNavigationArrangement } from '@stump/client'
import { Card, cn, Heading, IconButton, Label, Text, ToolTip } from '@stump/components'
import { Lock, Unlock } from 'lucide-react'
import React, { useCallback, useMemo } from 'react'

import { usePreferences } from '@/hooks'

import NavigationArrangementItem from './NavigationArrangementItem'

export default function NavigationArrangement() {
	const {
		preferences: { primary_navigation_mode },
	} = usePreferences()
	const {
		arrangement: { items, locked },
		updateArrangement,
	} = useNavigationArrangement()

	const sensors = useSensors(
		useSensor(PointerSensor),
		useSensor(KeyboardSensor, {
			coordinateGetter: sortableKeyboardCoordinates,
		}),
	)

	const handleDragEnd = useCallback(
		async (event: DragEndEvent) => {
			const { active, over } = event

			if (!!over?.id && active.id !== over.id) {
				const oldIndex = items.findIndex(({ item }) => item.type === active.id)
				const newIndex = items.findIndex(({ item }) => item.type === over.id)

				await updateArrangement({
					items: arrayMove(items, oldIndex, newIndex),
					locked,
				})
			}
		},
		[items, locked, updateArrangement],
	)

	const setLocked = useCallback(
		async (isLocked: boolean) => {
			await updateArrangement({ items, locked: isLocked })
		},
		[items, updateArrangement],
	)

	const setItemVisibility = useCallback(
		async (index: number, visible: boolean) => {
			if (locked) return

			const targetItem = items[index]

			if (!!targetItem && targetItem.visible !== visible) {
				await updateArrangement({
					items: items.map((item, i) => (i === index ? { ...item, visible } : item)),
					locked,
				})
			}
		},
		[items, locked, updateArrangement],
	)

	const renderLockedButton = () => {
		const Icon = locked ? Lock : Unlock
		const help = locked ? 'Unlock arrangement' : 'Lock arrangement'

		return (
			<ToolTip content={help} align="end" size="sm">
				<IconButton aria-label={help} onClick={() => setLocked(!locked)} variant="ghost" size="sm">
					<Icon className="h-4 w-4 text-muted" />
				</IconButton>
			</ToolTip>
		)
	}

	const identifiers = useMemo<string[]>(() => items.map(({ item }) => item.type), [items])

	// TODO: not smooth animation at all...

	return (
		<div className="flex w-full flex-col space-y-4">
			<div className="flex items-center justify-between">
				<div>
					<Label>Navigation arrangement</Label>
					<Text size="sm" variant="muted" className="mt-1.5">
						Arrange and customize the navigation items in the{' '}
						{primary_navigation_mode === 'SIDEBAR' ? 'sidebar' : 'topbar'}
					</Text>
				</div>

				{renderLockedButton()}
			</div>

			<Card
				className={cn('flex flex-col space-y-4 bg-background-200 p-4', {
					'cursor-not-allowed opacity-60': locked,
				})}
			>
				<DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
					<SortableContext items={identifiers} strategy={verticalListSortingStrategy}>
						{items.map(({ item, visible }, idx) => (
							<NavigationArrangementItem
								item={item}
								active={visible ?? true}
								toggleActive={() => setItemVisibility(idx, !visible)}
								key={item.type}
								disabled={locked}
							/>
						))}
					</SortableContext>
				</DndContext>
			</Card>
		</div>
	)
}
