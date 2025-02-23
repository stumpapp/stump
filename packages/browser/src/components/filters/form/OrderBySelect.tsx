import { Label, NativeSelect } from '@stump/components'
import { MediaMetadataOrderBy, MediaOrderBy } from '@stump/sdk'
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

const LOCALE_KEY = 'orderBy'
const getEntityKey = (entity: FilterableEntity, key: string) => `${LOCALE_KEY}.${entity}.${key}`

const MEDIA_ORDER: Record<Exclude<MediaOrderBy, { metadata: MediaMetadataOrderBy[] }>, string> = {
	created_at: getEntityKey('media', 'created_at'),
	extension: getEntityKey('media', 'extension'),
	name: getEntityKey('media', 'name'),
	pages: getEntityKey('media', 'pages'),
	path: getEntityKey('media', 'path'),
	size: getEntityKey('media', 'size'),
	status: getEntityKey('media', 'status'),
	updated_at: getEntityKey('media', 'updated_at'),
}
