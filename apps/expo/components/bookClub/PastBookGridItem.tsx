import { FragmentType, graphql, useFragment } from '@stump/graphql'

const fragment = graphql(`
	fragment PastBookGridItem on BookClubBook {
		id
		imageUrl
		entity {
			__typename
			id
			thumbnail {
				url
				metadata {
					averageColor
					colors {
						color
						percentage
					}
					thumbhash
				}
			}
		}
		completedAt
	}
`)

type Props = {
	data: FragmentType<typeof fragment>
	messageCount: number
}

export function PastBookGridItem({ data }: Props) {
	const book = useFragment(fragment, data)
	return null
}
