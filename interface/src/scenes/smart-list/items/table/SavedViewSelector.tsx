import { NativeSelect } from '@stump/components'
import React, { useMemo } from 'react'

import { useSmartListContext } from '../../context'

export default function SavedViewSelector() {
	const {
		workingView,
		list: { saved_views },
	} = useSmartListContext()

	const options = useMemo(
		() => (saved_views ?? []).map(({ name }) => ({ label: name, value: name })),
		[saved_views],
	)

	const isDisabled = !saved_views || !saved_views.length

	return (
		<NativeSelect
			title={isDisabled ? 'No saved views' : 'Select a saved view'}
			className="w-[185px]"
			options={options}
			emptyOption={{ label: workingView ? 'Custom view' : 'Default view', value: '' }}
			disabled={isDisabled}
		/>
	)
}
