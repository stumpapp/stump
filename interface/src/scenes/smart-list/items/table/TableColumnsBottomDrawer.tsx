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
import React, { useMemo, useState } from 'react'

import { useSafeWorkingView } from '../../context'
import { columnOptionMap } from './mediaColumns'

export default function TableColumnsBottomDrawer() {
	const {
		workingView: { columns: selectedColumns, enable_multi_sort },
		updateWorkingView,
	} = useSafeWorkingView()

	/**
	 * The local state to track the selected columns. This will be used to update the
	 * context working view once the user clicks save
	 */
	const [selectState, setSelectState] = useState<Record<string, boolean>>(() => {
		const state: Record<string, boolean> = {}
		selectedColumns.forEach(({ id }) => {
			state[id] = true
		})
		return state
	})

	/**
	 * The local state to track whether multi-sort is enabled
	 */
	const [multiSort, setMultiSort] = useState(() => enable_multi_sort ?? false)

	/**
	 * The options available to the user to select from
	 */
	const columnOptions = useMemo(
		() =>
			Object.entries(columnOptionMap).map(([key, label]) => ({
				isSelected: selectState[key] ?? false,
				label,
				value: key,
			})),
		[selectState],
	)

	/**
	 * A callback to update the local state when a column is selected or deselected
	 * @param id The ID of the column to update
	 */
	const handleChangeColumnState = (id: string) => {
		setSelectState((state) => ({ ...state, [id]: !state[id] }))
	}

	/**
	 * A callback to update the working view with the current local state
	 */
	const handleSave = () => {
		const columns = Object.entries(selectState)
			.filter(([, isSelected]) => isSelected)
			.map(([id], idx) => ({ id, position: idx }))

		const enable_multi_sort = multiSort || undefined

		updateWorkingView({ columns, enable_multi_sort })
	}

	// const handleReset = useCallback(() => {
	// 	setSelectState(() => {
	// 		const newState: Record<string, boolean> = {}
	// 		selectedColumns.forEach(({ id }) => {
	// 			newState[id] = true
	// 		})
	// 		return newState
	// 	})
	// }, [selectedColumns])

	return (
		<Drawer>
			<ToolTip content="Adjust columns">
				<Drawer.Trigger asChild>
					<IconButton variant="ghost">
						<TableProperties className="h-4 w-4 text-muted" />
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
						<div>
							<Label>Book columns</Label>
							<Text size="sm" variant="muted">
								This only affects the nested book table(s)
							</Text>
							<div className="mt-3 grid grid-cols-5 gap-x-2 gap-y-4">
								{columnOptions.map(({ label, value, isSelected }) => (
									<CheckBox
										checked={isSelected}
										key={value}
										label={label}
										onClick={() => handleChangeColumnState(value)}
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
