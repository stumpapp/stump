import { NativeSelect } from '@stump/components'
import React, { useCallback, useMemo } from 'react'

import { useSmartListContext } from '../../context'

export default function SavedViewSelector() {
	const {
		workingView,
		selectedView,
		selectStoredView,
		list: { saved_views },
	} = useSmartListContext()

	/**
	 * The options available to the user to select from, pulled from the saved views on
	 * the smart list
	 */
	const options = useMemo(() => {
		const baseOptions = (saved_views ?? []).map(({ name }) => ({ label: name, value: name }))
		if (baseOptions.length) {
			return [{ label: 'Default view', value: '' }, ...baseOptions]
		} else {
			return baseOptions
		}
	}, [saved_views])

	/**
	 * The empty option to display when there are no saved views. This will be undefined if there are
	 * saved views so the default view is selectable
	 */
	const emptyOption = useMemo(
		() =>
			options.length
				? undefined
				: { label: workingView ? 'Custom view' : 'Default view', value: '' },
		[options, workingView],
	)

	/**
	 * A change handler to update the selected view in the context
	 */
	const handleChange = useCallback(
		(e: React.ChangeEvent<HTMLSelectElement>) => {
			const name = e.target.value
			if (!name) {
				selectStoredView(undefined)
			} else {
				const view = saved_views?.find((view) => view.name === name)
				if (view) {
					selectStoredView(view)
				}
			}
		},
		[saved_views, selectStoredView],
	)

	const isDisabled = !saved_views || !saved_views.length

	return (
		<NativeSelect
			title={isDisabled ? 'No saved views' : 'Select a saved view'}
			className="w-[185px]"
			options={options}
			emptyOption={emptyOption}
			disabled={isDisabled}
			value={selectedView?.name}
			onChange={handleChange}
		/>
	)
}
