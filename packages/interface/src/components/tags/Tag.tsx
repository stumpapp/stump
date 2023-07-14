import { Text } from '@stump/components'
import { Tag } from '@stump/types'

interface Props {
	tag: Tag
}

// TODO: more styling
// TODO: optional link to filter by tag
export default function TagComponent({ tag }: Props) {
	return (
		<Text variant="muted" size="xs">
			#{tag.name}
		</Text>
	)
}
