import { useSuspenseGraphQL } from '@stump/client'
import { Breadcrumbs, NewCard } from '@stump/components'
import { graphql } from '@stump/graphql'
import { useParams } from 'react-router'

import { SceneContainer } from '@/components/container'
import { PageHeader } from '@/components/sharedLayout'

const query = graphql(`
	query AuthorByIdWeb($id: ID!) {
		authorById(id: $id) {
			name
			books {
				resolvedName
			}
			series {
				resolvedName
			}
		}
	}
`)

export default function AuthorById() {
	const { id } = useParams()
	const {
		data: { authorById: author },
	} = useSuspenseGraphQL(query, ['authorById', id], { id: id ?? '' })

	return (
		<>
			<PageHeader>
				<PageHeader.Start>
					<Breadcrumbs
						segments={[
							{ label: 'Authors', to: '/authors' },
							{
								label: author.name,
								noShrink: true,
							},
						]}
					/>
				</PageHeader.Start>
			</PageHeader>

			<SceneContainer className="gap-8">
				<div>
					<NewCard.ListLabel>Books</NewCard.ListLabel>

					{JSON.stringify(author.books)}
				</div>

				<div>
					<NewCard.ListLabel>Series</NewCard.ListLabel>

					{JSON.stringify(author.series)}
				</div>
			</SceneContainer>
		</>
	)
}
