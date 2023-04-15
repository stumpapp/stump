import { Badge } from '@stump/components'
import { Tag } from '@stump/types'

interface Props {
	tag: Tag
}

export default function TagComponent({ tag }: Props) {
	return <Badge variant="primary">{tag.name}</Badge>
}
