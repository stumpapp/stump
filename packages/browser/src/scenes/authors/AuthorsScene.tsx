import { useSuspenseGraphQL } from '@stump/client'
import { Avatar, Breadcrumbs, Text } from '@stump/components'
import { graphql } from '@stump/graphql'

import { SceneContainer } from '@/components/container'
import { PageHeader } from '@/components/sharedLayout'

const query = graphql(`
	query AuthorsSceneWeb {
		authors {
			nodes {
				id
				name
				avatar {
					url
				}
			}
		}
	}
`)

// TODO: for some reason with authors i feel way more compelled to break from the paginated
// model otherwise everywhere in the web app. not sure yet if i should lean into that

export default function AuthorsScene() {
	const {
		data: {
			authors: { nodes: authors },
		},
	} = useSuspenseGraphQL(query, ['authors'])

	return (
		<>
			<PageHeader>
				<PageHeader.Start>
					<Breadcrumbs segments={[{ label: 'Authors', noShrink: true }]} />
				</PageHeader.Start>
			</PageHeader>

			<SceneContainer>
				<div className="gap-x-4 gap-y-6 grid grid-cols-[repeat(auto-fill,minmax(8rem,1fr))]">
					{authors.map((author) => (
						<div key={author.id} className="min-w-0 gap-2 flex flex-col items-center">
							<Avatar
								className="h-30 w-30"
								fallback={author.name}
								fallbackWrapperClassName="text-3xl font-medium"
								src={author.avatar.url}
							/>

							<Text size="sm" className="font-medium leading-tight line-clamp-2 w-full text-center">
								{author.name}
							</Text>
						</div>
					))}
				</div>
			</SceneContainer>
		</>
	)
}
