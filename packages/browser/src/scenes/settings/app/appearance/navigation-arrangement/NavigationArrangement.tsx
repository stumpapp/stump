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
import { useLocaleContext } from '@stump/i18n'
import { NavigationItem } from '@stump/types'
import isEqual from 'lodash.isequal'
import { Lock, Unlock } from 'lucide-react'
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'

import { useAppContext } from '@/context'
import { usePreferences } from '@/hooks'

import NavigationArrangementItem from './NavigationArrangementItem'
import { IEntityOptions, isNavigationItemWithEntityOptions } from './types'

export default function NavigationArrangement() {
	const { t } = useLocaleContext()
	const { checkPermission } = useAppContext()
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

	/**
	 * A callback to check if the current user has permission to access a specific item.
	 * There is no point in allowing a user to configure an item which is for a feature
	 * they do not have access to.
	 */
	const checkItemPermission = useCallback(
		(type: NavigationItem['type']) => {
			if (type === 'SmartLists') {
				return checkPermission('smartlist:read')
			} else if (type === 'BookClubs') {
				return checkPermission('bookclub:read')
			} else {
				return true
			}
		},
		[checkPermission],
	)

	const [localArragement, setLocalArrangement] = useState(() => arrangement)

	/**
	 * A callback to actually update the arrangement on the server.
	 */
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
	/**
	 * An effect which will update the arrangement whenever the local arrangement is different
	 * from the current arrangement which has been fetched from the server.
	 */
	useEffect(() => {
		if (isDifferent) {
			handleUpdateArrangement(localArragement)
		}
	}, [isDifferent, handleUpdateArrangement, localArragement])

	/**
	 * A callback to handle the end of a drag event. This will update the arrangement
	 * based on the new order of the items.
	 */
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

	/**
	 * A callback to set the visibility of an item in the arrangement.
	 *
	 * @param index The index of the item in the arrangement
	 * @param visible The visibility of the item
	 */
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

	/**
	 * A callback to set the options of an entity, provided the entity is an entity with options
	 * and exists in the current arrangement.
	 *
	 * @param idx The index of the item in the arrangement
	 * @param options The options to set
	 */
	const setEntityOptions = useCallback(
		async (idx: number, options: IEntityOptions) => {
			if (locked) return

			const targetItem = items[idx]

			if (!!targetItem && isNavigationItemWithEntityOptions(targetItem.item)) {
				const newInternalItem = { ...targetItem.item, ...options }
				setLocalArrangement(({ items, ...curr }) => ({
					items: items.map((item, index) =>
						index === idx ? { item: newInternalItem, visible: item.visible } : item,
					),
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
					<Icon className="h-4 w-4 text-foreground-muted" />
				</IconButton>
			</ToolTip>
		)
	}

	/**
	 * IDs used in the SortableContext, used to properly sort and drag items
	 */
	const identifiers = useMemo<string[]>(() => items.map(({ item }) => item.type), [items])

	return (
		<div className="flex w-full flex-col space-y-4">
			<div className="flex items-center justify-between">
				<div>
					<Label>{t(getKey('label'))}</Label>
					<Text size="sm" variant="muted" className="mt-1.5">
						{t(getKey(`description.${primary_navigation_mode?.toLowerCase() || 'sidebar'}`))}
					</Text>
				</div>

				{renderLockedButton()}
			</div>

			<Card
				className={cn('relative flex flex-col space-y-4 bg-background-surface p-4 md:max-w-xl', {
					'cursor-not-allowed select-none opacity-60': locked,
				})}
				title={locked ? t(getKey('isLocked')) : undefined}
			>
				<DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
					<SortableContext items={identifiers} strategy={verticalListSortingStrategy}>
						{items.map(({ item, visible }, idx) => (
							<NavigationArrangementItem
								key={item.type}
								item={item}
								active={visible ?? true}
								toggleActive={() => setItemVisibility(idx, !visible)}
								onChangeOptions={(options) => setEntityOptions(idx, options)}
								disabled={locked}
								hidden={!checkItemPermission(item.type)}
							/>
						))}
					</SortableContext>
				</DndContext>
			</Card>
		</div>
	)
}

const LOCALE_BASE = 'settingsScene.app/appearance.sections.navigationArrangement'
const getKey = (key: string) => `${LOCALE_BASE}.${key}`
