import { Label, NativeSelect, Text } from '@stump/components'
import React, { useCallback } from 'react'
import { useFormContext } from 'react-hook-form'

import { isGrouping, SmartListFormSchema } from '../form/schema'

export default function GroupBy() {
	const form = useFormContext<SmartListFormSchema>()

	const grouping = form.watch('grouping')

	const handleChange = useCallback(
		(e: React.ChangeEvent<HTMLSelectElement>) => {
			if (isGrouping(e.target.value)) {
				form.setValue('grouping', e.target.value)
			}
		},
		[form],
	)

	return (
		<div className="flex flex-col space-y-1.5 pb-4">
			<Label>Group by</Label>
			<div>
				<NativeSelect
					className="h-8 w-[unset] py-0"
					options={[
						{
							label: 'None',
							value: 'BY_BOOKS',
						},
						{
							label: 'Series',
							value: 'BY_SERIES',
						},
						{
							label: 'Library',
							value: 'BY_LIBRARY',
						},
					]}
					value={grouping}
					onChange={handleChange}
				/>
			</div>
			<Text variant="muted" size="sm">
				Group matched books together by a common attribute
			</Text>
		</div>
	)
}
