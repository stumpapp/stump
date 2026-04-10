import { Tag } from '@stump/graphql'

import BadgeList from '@/components/BadgeList'

import TagComponent from './Tag'

type Props = {
	tags: Tag[] | null
	baseUrl?: string
}

export default function TagList({ tags, baseUrl }: Props) {
	if (!tags?.length) {
		return null
	}

	return (
		<BadgeList>
			{tags
				.filter((tag) => !!tag.name)
				.map((tag) => (
					<TagComponent
						key={tag.id}
						tag={tag}
						{...(baseUrl ? { href: `${baseUrl}?tags[]=${tag.name}` } : {})}
					/>
				))}
		</BadgeList>
	)
}
