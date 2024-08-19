import {
	Button,
	CheckBox,
	Drawer,
	IconButton,
	Label,
	RawSwitch,
	Text,
	ToolTip,
} from '@stump/components'
import { TableProperties } from 'lucide-react'
import React, { useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'

import { useSafeWorkingView, useSmartListContext } from '../../context'
import { getColumnOptionMap as getGroupColumnOptionMap } from './groupColumns'
import { columnOptionMap as mediaColumnOptionMap } from './mediaColumns'

export default function TableColumnsBottomDrawer() {
	const [isOpen, setIsOpen] = useState(false)
	const {
		list: { default_grouping },
	} = useSmartListContext()
	const {
		workingView: {
			book_columns: selectedBookColumns,
			group_columns: selectedGroupColumns,
			enable_multi_sort,
		},
		updateWorkingView,
	} = useSafeWorkingView()

	const isGrouped = !default_grouping || default_grouping !== 'BY_BOOKS'

	/**
	 * The local state to track the selected columns for the book table(s). This will be used to
	 * update the context working view once the user clicks save
	 */
	const [bookColumnState, setBookColumnState] = useState<Record<string, boolean>>(() => {
		const state: Record<string, boolean> = {}
		selectedBookColumns.forEach(({ id }) => {
			state[id] = true
		})
		return state
	})

	/**
	 * The local state to track the selected columns of the parent table (if any)
	 */
	const [groupByEntityColumnState, setGroupByEntityColumnState] = useState<Record<string, boolean>>(
		() => {
			const state: Record<string, boolean> = {}
			selectedGroupColumns.forEach(({ id }) => {
				state[id] = true
			})
			return state
		},
	)

	/**
	 * The local state to track whether multi-sort is enabled
	 */
	const [multiSort, setMultiSort] = useState(() => enable_multi_sort ?? false)

	/**
	 * The options available to the user to select from
	 */
	const bookColumnOptions = useMemo(
		() =>
			Object.entries(mediaColumnOptionMap).map(([key, label]) => ({
				isSelected: bookColumnState[key] ?? false,
				label,
				value: key,
			})),
		[bookColumnState],
	)

	const isGroupedBySeries = default_grouping === 'BY_SERIES'
	const groupColumnOptions = useMemo(() => {
		if (isGrouped) {
			const all = getGroupColumnOptionMap(isGroupedBySeries)
			return Object.entries(all).map(([key, label]) => ({
				isSelected: groupByEntityColumnState[key] ?? false,
				label,
				value: key,
			}))
		}

		return []
	}, [isGrouped, isGroupedBySeries, groupByEntityColumnState])

	/**
	 * A callback to update the local state when a book column is selected or deselected
	 * @param id The ID of the column to update
	 */
	const handleChangeBookColumnState = (id: string) => {
		setBookColumnState((state) => ({ ...state, [id]: !state[id] }))
	}

	/**
	 * A callback to update the local state when a group column is selected or deselected
	 * @param id
	 */
	const handleChangeGroupColumnState = (id: string) => {
		setGroupByEntityColumnState((state) => ({ ...state, [id]: !state[id] }))
	}

	/**
	 * A callback to update the working view with the current local state
	 */
	const handleSave = () => {
		const bookColumns = Object.entries(bookColumnState)
			.filter(([, isSelected]) => isSelected)
			.map(([id], idx) => ({ id, position: idx }))

		const groupColumns = Object.entries(groupByEntityColumnState)
			.filter(([, isSelected]) => isSelected)
			.map(([id], idx) => ({ id, position: idx }))

		if (!bookColumns.length || !groupColumns.length) {
			toast.error('You must select at least one column')
			return
		}

		const enable_multi_sort = multiSort || undefined

		updateWorkingView({ book_columns: bookColumns, enable_multi_sort, group_columns: groupColumns })
		setIsOpen(false)
	}

	/**
	 * An effect to update the local book column state whenever the working view changes
	 */
	useEffect(() => {
		setBookColumnState(() => {
			const newState: Record<string, boolean> = {}
			selectedBookColumns.forEach(({ id }) => {
				newState[id] = true
			})
			return newState
		})
	}, [selectedBookColumns])

	/**
	 * An effect to update the local group column state whenever the working view changes
	 */
	useEffect(() => {
		setGroupByEntityColumnState(() => {
			const newState: Record<string, boolean> = {}
			selectedGroupColumns.forEach(({ id }) => {
				newState[id] = true
			})
			return newState
		})
	}, [selectedGroupColumns])

	/**
	 * An effect to update the local multi-sort state whenever the working view changes
	 */
	useEffect(() => {
		setMultiSort(enable_multi_sort ?? false)
	}, [enable_multi_sort])

	const handleOpenChanged = (nowOpen: boolean) => {
		if (!nowOpen) {
			setIsOpen(false)
		}
	}

	return (
		<Drawer open={isOpen} onOpenChange={handleOpenChanged}>
			<ToolTip content="Adjust columns">
				<Drawer.Trigger asChild onClick={() => setIsOpen(true)}>
					<IconButton variant="ghost">
						<TableProperties className="h-4 w-4 text-foreground-muted" />
					</IconButton>
				</Drawer.Trigger>
			</ToolTip>
			<Drawer.Content>
				<div className="mx-auto w-full max-w-2xl">
					<Drawer.Header>
						<Drawer.Title>Table configuration</Drawer.Title>
						<Drawer.Description>Choose which columns to display or hide</Drawer.Description>
					</Drawer.Header>
					<div className="flex flex-col gap-y-6 p-4 pb-0">
						{isGrouped && (
							<div>
								<Label>Group columns</Label>
								<Text size="sm" variant="muted">
									This only affects the parent table by which books are grouped
								</Text>
								<div className="mt-3 grid grid-cols-5 gap-x-2 gap-y-4">
									{groupColumnOptions.map(({ label, value, isSelected }) => (
										<CheckBox
											id={value}
											checked={isSelected}
											key={value}
											label={label}
											onClick={() => handleChangeGroupColumnState(value)}
											variant="primary"
										/>
									))}
								</div>
							</div>
						)}

						<div>
							<Label>Book columns</Label>
							<Text size="sm" variant="muted">
								This only affects the nested book table(s)
							</Text>
							<div className="mt-3 grid grid-cols-5 gap-x-2 gap-y-4">
								{bookColumnOptions.map(({ label, value, isSelected }) => (
									<CheckBox
										id={value}
										checked={isSelected}
										key={value}
										label={label}
										onClick={() => handleChangeBookColumnState(value)}
										variant="primary"
									/>
								))}
							</div>
						</div>

						<div className="flex items-center justify-between">
							<div className="flex flex-grow flex-col gap-2 text-left">
								<Label htmlFor="enable_multi_sort">Enable multi-sort</Label>
								<Text size="sm" variant="muted">
									Sorting by a column removes the previous sort. This setting allows combining them,
									instead
								</Text>
							</div>

							<div className="w-6" />

							<RawSwitch
								id="enable_multi_sort"
								checked={multiSort}
								onClick={() => setMultiSort((state) => !state)}
								primaryRing
								variant="primary"
							/>
						</div>
					</div>
					<Drawer.Footer className="w-full flex-row">
						<Button className="w-full" onClick={handleSave}>
							Save
						</Button>
						<Drawer.Close asChild className="w-full">
							<Button variant="outline">Cancel</Button>
						</Drawer.Close>
					</Drawer.Footer>
				</div>
			</Drawer.Content>
		</Drawer>
	)
}
