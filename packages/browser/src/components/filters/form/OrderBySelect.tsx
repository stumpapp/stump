import { Label, NativeSelect } from '@stump/components'
import { LibraryModelOrdering, MediaModelOrdering, SeriesModelOrdering } from '@stump/graphql'
import { useMemo } from 'react'

import { OrderingField } from '../context'
// const commonOptions = ['name', 'status', 'created_at', 'path']
// const options: Record<FilterableEntity, string[]> = {
// 	library: commonOptions,
// 	media: [...commonOptions, 'size', 'extension', 'pages', 'series_id', 'modified_at'],
// 	series: [...commonOptions, 'description', 'library_id'],
// }
//
import { FilterableEntity } from '.'
const options: Record<FilterableEntity, OrderingField[]> = {
	library: [LibraryModelOrdering.Name, LibraryModelOrdering.Status, LibraryModelOrdering.CreatedAt],
	media: [
		MediaModelOrdering.Name,
		MediaModelOrdering.Status,
		MediaModelOrdering.CreatedAt,
		MediaModelOrdering.Path,
		MediaModelOrdering.Size,
		MediaModelOrdering.Extension,
		MediaModelOrdering.Pages,
		MediaModelOrdering.SeriesId,
		MediaModelOrdering.ModifiedAt,
	],
	series: [
		SeriesModelOrdering.Name,
		SeriesModelOrdering.Status,
		SeriesModelOrdering.CreatedAt,
		SeriesModelOrdering.Description,
		SeriesModelOrdering.LibraryId,
	],
}

// TODO: accept a default value which, if value equals, do an onChange with an empty string
type Props = {
	entity: FilterableEntity
	value?: string
	onChange?: (value: OrderingField) => void
}
export default function OrderBySelect({ entity, value, onChange }: Props) {
	const entityOptions = useMemo(
		() =>
			options[entity].map((option) => ({ label: (option as string).toLowerCase(), value: option })),
		[entity],
	)

	return (
		<div>
			<Label htmlFor="orderBy" className="mb-1.5">
				Order by
			</Label>
			<NativeSelect
				options={entityOptions}
				emptyOption={{ label: 'Select an option', value: '' }}
				value={value}
				onChange={(e) => onChange?.(e.target.value as OrderingField)}
				size="sm"
			/>
		</div>
	)
}
