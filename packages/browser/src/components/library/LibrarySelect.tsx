import { useGraphQL } from '@stump/client'
import { Select } from '@stump/components'
import { graphql } from '@stump/graphql'

const query = graphql(`
	query LibrarySelectWeb {
		libraries(pagination: { none: { unpaginated: true } }) {
			nodes {
				id
				name
			}
		}
	}
`)

type Props = {
	selectedId?: string
	onChange: (id: string) => void
}

// TODO(authors): localize
// - also generalize so the placeholder/empty value is configured
export function LibrarySelect({ selectedId, onChange }: Props) {
	const { data, isLoading } = useGraphQL(query, ['librarySelect'])

	const libraries = data?.libraries?.nodes ?? []

	return (
		<Select value={selectedId ?? ''} onValueChange={onChange}>
			<Select.Trigger size="sm" disabled={isLoading}>
				<Select.Value placeholder="All Libraries" />
			</Select.Trigger>

			<Select.Content>
				<Select.Item value="">All Libraries</Select.Item>
				{libraries.map(({ id, name }) => (
					<Select.Item key={id} value={id}>
						{name}
					</Select.Item>
				))}
			</Select.Content>
		</Select>
	)
}
