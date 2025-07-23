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
import { useGraphQLMutation, useSDK, useSuspenseGraphQL } from '@stump/client'
import { Button, Card, cn, Label, Text, ToolTip } from '@stump/components'
import {
	ArrangementSectionInput,
	FilterableArrangementEntityLink,
	graphql,
	NavigationArrangementInput,
	NavigationArrangementQuery,
	UserPermission,
} from '@stump/graphql'
import { useLocaleContext } from '@stump/i18n'
import { NavigationItem } from '@stump/sdk'
import { useQueryClient } from '@tanstack/react-query'
import { Lock, Unlock } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { match } from 'ts-pattern'

import { useAppContext } from '@/context'
import { usePreferences } from '@/hooks'

import NavigationArrangementItem from './NavigationArrangementItem'

const query = graphql(`
	query NavigationArrangement {
		me {
			preferences {
				navigationArrangement {
					locked
					sections {
						__typename
						config {
							__typename
							... on SystemArrangementConfig {
								variant
								links
							}
						}
						visible
					}
				}
			}
		}
	}
`)

const updateMutation = graphql(`
	mutation NavigationArrangementUpdate($input: NavigationArrangementInput!) {
		updateNavigationArrangement(input: $input) {
			__typename
		}
	}
`)

const lockMutation = graphql(`
	mutation NavigationArrangementUpdateLockStatus($locked: Boolean!) {
		updateNavigationArrangementLock(locked: $locked) {
			__typename
		}
	}
`)

export default function NavigationArrangement() {
	const { t } = useLocaleContext()
	const { sdk } = useSDK()
	const { checkPermission } = useAppContext()
	const {
		preferences: { primaryNavigationMode },
	} = usePreferences()
	const {
		data: {
			me: {
				preferences: { navigationArrangement },
			},
		},
	} = useSuspenseGraphQL(query, sdk.cacheKey('navigationArrangement'))

	const client = useQueryClient()

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
				return checkPermission(UserPermission.AccessSmartList)
			} else if (type === 'BookClubs') {
				return checkPermission(UserPermission.AccessBookClub)
			} else {
				return true
			}
		},
		[checkPermission],
	)

	const [localArrangement, setLocalArrangement] = useState(() => navigationArrangement)

	useEffect(() => {
		setLocalArrangement(navigationArrangement)
	}, [navigationArrangement])

	const { mutate: updateArrangement } = useGraphQLMutation(updateMutation, {
		onSuccess: () => {
			client.refetchQueries({ queryKey: sdk.cacheKey('navigationArrangement') })
			client.refetchQueries({ queryKey: sdk.cacheKey('sidebar') })
		},
	})

	const { mutate: updateLockStatus } = useGraphQLMutation(lockMutation, {
		onSuccess: (_, { locked }) => {
			setLocalArrangement((curr) => ({ ...curr, locked }))
		},
	})

	/**
	 * A callback to actually update the arrangement on the server.
	 */
	const handleUpdateArrangement = useCallback(
		async (input: NavigationArrangementInput) => {
			if (localArrangement.locked) return
			updateArrangement({ input })
			// try {
			// 	const result = await updateArrangement(updates)
			// 	if (!isEqual(result, localArrangement)) {
			// 		setLocalArrangement(result)
			// 	}
			// } catch (error) {
			// 	console.error(error)
			// 	toast.error('Failed to update navigation arrangement')
			// }
		},
		[updateArrangement, localArrangement],
	)

	// const isDifferent = useMemo(
	// 	() => !isEqual(localArrangement, arrangement),
	// 	[localArrangement, arrangement],
	// )
	/**
	 * An effect which will update the arrangement whenever the local arrangement is different
	 * from the current arrangement which has been fetched from the server.
	 */
	// useEffect(() => {
	// 	if (isDifferent) {
	// 		handleUpdateArrangement(localArrangement)
	// 	}
	// }, [isDifferent, handleUpdateArrangement, localArrangement])

	/**
	 * A callback to handle the end of a drag event. This will update the arrangement
	 * based on the new order of the items.
	 */
	const handleDragEnd = (event: DragEndEvent) => {
		const { active, over } = event

		if (!!over?.id && active.id !== over.id) {
			// setLocalArrangement(({ items, ...curr }) => {
			// 	const oldIndex = items.findIndex(({ item }) => item.type === active.id)
			// 	const newIndex = items.findIndex(({ item }) => item.type === over.id)

			// 	return {
			// 		items: arrayMove(items, oldIndex, newIndex),
			// 		...curr,
			// 	}
			// })

			const oldIndex = localArrangement.sections.findIndex(
				(section) => getSectionId(section) === active.id,
			)
			const newIndex = localArrangement.sections.findIndex(
				(section) => getSectionId(section) === over.id,
			)
			const newSections = arrayMove(localArrangement.sections, oldIndex, newIndex)
			setLocalArrangement((curr) => ({ ...curr, sections: newSections }))
			updateArrangement({
				input: {
					sections: newSections.map(toArrangementInput),
				},
			})
		}
	}

	// const setLocked = (isLocked: boolean) =>
	// 	setLocalArrangement((curr) => ({ ...curr, locked: isLocked }))

	const { sections, locked } = localArrangement

	/**
	 * A callback to set the visibility of an item in the arrangement.
	 *
	 * @param index The index of the item in the arrangement
	 * @param visible The visibility of the item
	 */
	const onChangeVisibility = useCallback(
		async (index: number, visible: boolean) => {
			if (locked) return

			const targetItem = sections[index]

			if (!!targetItem && targetItem.visible !== visible) {
				updateArrangement({
					input: {
						sections: sections
							.map((item, idx) => (idx === index ? { ...item, visible } : item))
							.map(toArrangementInput),
					},
				})
			}
		},
		[sections, locked, updateArrangement],
	)

	const onChangeLinks = useCallback(
		async (idx: number, links: FilterableArrangementEntityLink[]) => {
			if (locked) return

			const targetItem = sections[idx]
			if (targetItem?.config.__typename !== 'SystemArrangementConfig') return

			const newConfig = {
				...targetItem.config,
				links,
			}

			updateArrangement({
				input: {
					sections: sections
						.map((item, index) => (index === idx ? { ...item, config: newConfig } : item))
						.map(toArrangementInput),
				},
			})
		},
		[sections, locked, updateArrangement],
	)

	const renderLockedButton = () => {
		const Icon = locked ? Lock : Unlock
		const help = locked ? 'Unlock arrangement' : 'Lock arrangement'

		return (
			<ToolTip content={help} align="end" size="sm">
				<Button
					size="icon"
					aria-label={help}
					onClick={() => updateLockStatus({ locked: !locked })}
					variant="ghost"
				>
					<Icon className="h-4 w-4 text-foreground-muted" />
				</Button>
			</ToolTip>
		)
	}

	// TODO: Probably not a good ID...
	/**
	 * IDs used in the SortableContext, used to properly sort and drag items
	 */
	const identifiers = useMemo<string[]>(() => sections.map(getSectionId), [sections])

	return (
		<div className="flex w-full flex-col space-y-4">
			<div className="flex items-center justify-between">
				<div>
					<Label>{t(getKey('label'))}</Label>
					<Text size="sm" variant="muted" className="mt-1.5">
						{t(getKey(`description.${primaryNavigationMode?.toLowerCase() || 'sidebar'}`))}
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
						{sections.map((section, idx) => (
							<NavigationArrangementItem
								key={identifiers[idx]}
								section={section}
								disabled={locked}
								onChangeLinks={(links) => onChangeLinks(idx, links)}
								onChangeVisibility={() => onChangeVisibility(idx, !section.visible)}
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

type Section =
	NavigationArrangementQuery['me']['preferences']['navigationArrangement']['sections'][number]

const toArrangementInput = (arrangement: Section): ArrangementSectionInput => {
	const config = match(arrangement)
		.with(
			{ config: { __typename: 'SystemArrangementConfig' } },
			// eslint-disable-next-line @typescript-eslint/no-unused-vars
			({ visible, config: { __typename: _, ...system } }) =>
				({
					visible,
					config: {
						system,
					},
				}) satisfies ArrangementSectionInput,
		)
		.otherwise(() => null)

	if (!config) {
		console.warn(
			`NavigationArrangement: Unable to convert arrangement section with type "${arrangement.__typename}" to ArrangementSectionInput`,
		)
		throw new Error(`Invalid arrangement section type: ${arrangement.__typename}`)
	}

	return config
}

export const getSectionId = (section: Section): string => {
	if (section.config.__typename === 'SystemArrangementConfig') {
		return `${section.__typename}-${section.config.__typename}-${section.config.variant}`
	}

	return ''
}
