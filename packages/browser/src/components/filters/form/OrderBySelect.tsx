import { Label, NativeSelect } from '@stump/components'
import { useMemo } from 'react'

import { FilterableEntity } from '.'

const commonOptions = ['name', 'status', 'created_at', 'path']
const options: Record<FilterableEntity, string[]> = {
	library: commonOptions,
	media: [...commonOptions, 'size', 'extension', 'pages', 'series_id', 'modified_at'],
	series: [...commonOptions, 'description', 'library_id'],
}

// TODO: accept a default value which, if value equals, do an onChange with an empty string
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
		<div>
			<Label htmlFor="order_by" className="mb-1.5">
				Order by
			</Label>
			<NativeSelect
				options={entityOptions}
				emptyOption={{ label: 'Select an option', value: '' }}
				value={value}
				onChange={(e) => onChange?.(e.target.value)}
				size="sm"
			/>
		</div>
	)
}
