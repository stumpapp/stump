import { Link, Text } from '@stump/components'
import { Tag } from '@stump/graphql'
import { Fragment } from 'react'

type Props = {
	tag: Tag
	href?: string
}

// TODO: more styling
export default function TagComponent({ tag, href }: Props) {
	const Container = href ? Link : Fragment
	const containerProps = href ? { href, underline: false } : {}

	return (
		<Container {...containerProps}>
			<Text variant="muted" size="xs">
				#{tag.name}
			</Text>
		</Container>
	)
}
