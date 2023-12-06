import { NativeSelect } from '@stump/components'
import React, { useMemo } from 'react'

import { FilterableEntity } from '.'

const commonOptions = ['name', 'status', 'created_at', 'path']
const options: Record<FilterableEntity, string[]> = {
	library: commonOptions,
	media: [...commonOptions, 'size', 'extension', 'pages', 'series_id'],
	series: [...commonOptions, 'description', 'library_id'],
}

type Props = {
	entity: FilterableEntity
	value?: string
	onChange?: (value: string) => void
}
export default function OrderBySelect({ entity, value, onChange }: Props) {
	const entityOptions = useMemo(
		() => options[entity].map((option) => ({ label: option, value: option })),
		[entity],
	)

	return (
		<NativeSelect
			options={entityOptions}
			emptyOption={{ label: 'Select an option', value: '' }}
			value={value}
			onChange={(e) => onChange?.(e.target.value)}
			size="sm"
		/>
	)
}
