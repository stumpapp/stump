import { Tag } from '@stump/graphql'

import TagComponent from './Tag'

export const DEBUG_TAGS: Tag[] = [
	{
		id: 1,
		name: 'Action',
	},
	{
		id: 2,
		name: 'Adventure',
	},
	{
		id: 3,
		name: 'Comedy',
	},
	{
		id: 4,
		name: 'Drama',
	},
]

type Props = {
	tags: Tag[] | null
	baseUrl?: string
}

export default function TagList({ tags, baseUrl }: Props) {
	if (!tags && !import.meta.env.DEV) {
		return null
	}

	return (
		<div className="space-x-2 flex flex-row">
			{(tags ?? DEBUG_TAGS)
				.filter((tag) => !!tag.name)
				.map((tag) => (
					<TagComponent
						key={tag.id}
						tag={tag}
						{...(baseUrl ? { href: `${baseUrl}?tags[]=${tag.name}` } : {})}
					/>
				))}
		</div>
	)
}
