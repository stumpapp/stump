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
import { Card, cn, IconButton, Label, Text, ToolTip } from '@stump/components'
import isEqual from 'lodash.isequal'
import { Lock, Unlock } from 'lucide-react'
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'

import { usePreferences } from '@/hooks'

import NavigationArrangementItem from './NavigationArrangementItem'

// TODO: feature permissions (e.g. not allowed to access smart lists)
export default function NavigationArrangement() {
	const {
		preferences: { primary_navigation_mode },
	} = usePreferences()
	const { arrangement, updateArrangement } = useNavigationArrangement()

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

	const [localArragement, setLocalArrangement] = useState(() => arrangement)

	const handleUpdateArrangement = useCallback(
		async (updates: typeof localArragement) => {
			try {
				const result = await updateArrangement(updates)
				if (!isEqual(result, localArragement)) {
					setLocalArrangement(result)
				}
			} catch (error) {
				console.error(error)
				toast.error('Failed to update navigation arrangement')
			}
		},
		[updateArrangement, localArragement],
	)

	const isDifferent = useMemo(
		() => !isEqual(localArragement, arrangement),
		[localArragement, arrangement],
	)
	useEffect(() => {
		if (isDifferent) {
			handleUpdateArrangement(localArragement)
		}
	}, [isDifferent, handleUpdateArrangement, localArragement])

	const handleDragEnd = (event: DragEndEvent) => {
		const { active, over } = event

		if (!!over?.id && active.id !== over.id) {
			setLocalArrangement(({ items, ...curr }) => {
				const oldIndex = items.findIndex(({ item }) => item.type === active.id)
				const newIndex = items.findIndex(({ item }) => item.type === over.id)

				return {
					items: arrayMove(items, oldIndex, newIndex),
					...curr,
				}
			})
		}
	}

	const setLocked = (isLocked: boolean) =>
		setLocalArrangement((curr) => ({ ...curr, locked: isLocked }))

	const { items, locked } = localArragement

	const setItemVisibility = useCallback(
		async (index: number, visible: boolean) => {
			if (locked) return

			const targetItem = items[index]

			if (!!targetItem && targetItem.visible !== visible) {
				setLocalArrangement(({ items, ...curr }) => ({
					items: items.map((item, idx) => (idx === index ? { ...item, visible } : item)),
					...curr,
				}))
			}
		},
		[items, locked],
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
				className={cn('relative flex flex-col space-y-4 bg-background-200 p-4', {
					'cursor-not-allowed opacity-60': locked,
				})}
				title={locked ? 'Arrangement is locked' : undefined}
			>
				<DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
					<SortableContext items={identifiers} strategy={verticalListSortingStrategy}>
						{items.map(({ item, visible }, idx) => (
							<NavigationArrangementItem
								key={item.type}
								item={item}
								active={visible ?? true}
								toggleActive={() => setItemVisibility(idx, !visible)}
								disabled={locked}
							/>
						))}
					</SortableContext>
				</DndContext>
			</Card>
		</div>
	)
}
