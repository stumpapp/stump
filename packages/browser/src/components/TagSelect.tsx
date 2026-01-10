import { useSDK, useSuspenseGraphQL } from '@stump/client'
import { ComboBox } from '@stump/components'
import { graphql } from '@stump/graphql'
import { useCallback, useEffect, useState } from 'react'

const query = graphql(`
	query TagSelectQuery {
		tags {
			id
			name
		}
	}
`)

export type TagOption = {
	label: string
	value: string
}

type Props = {
	label?: string
	description?: string
	selected?: TagOption[]
	onChange: (selected?: TagOption[]) => void
}

export default function TagSelect({ label, description, selected = [], onChange }: Props) {
	const { sdk } = useSDK()
	const {
		data: { tags },
	} = useSuspenseGraphQL(query, sdk.cacheKey('tags'))

	const [options, setOptions] = useState<TagOption[]>(
		tags.map((tag) => ({ label: tag.name, value: tag.name.toLowerCase() })),
	)

	useEffect(() => {
		setOptions((curr) =>
			tags.map((tag) => {
				const exists = curr.find((option) => option.label === tag.name)
				if (!exists) {
					return { label: tag.name, value: tag.name.toLowerCase() }
				}
				return exists
			}),
		)
	}, [tags])

	const handleChange = useCallback(
		(newSelection?: string[]) => {
			onChange(
				newSelection?.map((value) => {
					const option = options.find((option) => option.value === value)
					if (!option) {
						return { label: value, value }
					}
					return option
				}),
			)
		},
		[onChange, options],
	)

	return (
		<ComboBox
			label={label || 'Tags'}
			description={description}
			options={options}
			value={selected.map(({ value }) => value)}
			onChange={handleChange}
			onAddOption={(option) => setOptions((curr) => [...curr, option])}
			isMultiSelect
			filterable
		/>
	)
}
