import { Tag } from '@stump/client'

import TagComponent from './Tag'

export const DEBUG_TAGS: Tag[] = [
	{
		id: '1',
		name: 'Action',
	},
	{
		id: '2',
		name: 'Adventure',
	},
	{
		id: '3',
		name: 'Comedy',
	},
	{
		id: '4',
		name: 'Drama',
	},
]

interface Props {
	tags: Tag[] | null
}

export default function TagList({ tags }: Props) {
	if (!tags && !import.meta.env.DEV) {
		return null
	}

	return (
		<div className="flex flex-row space-x-2">
			{(tags ?? DEBUG_TAGS).map((tag) => (
				<TagComponent key={tag.id} tag={tag} />
			))}
		</div>
	)
}
