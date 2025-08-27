import { Badge, cn } from '@stump/components'
import { Link } from 'react-router-dom'

import { useMetadataEditorContext } from '../context'
import TextCell from './TextCell'

type Props<Field> = {
	binding: Field
	value?: string | null
	onItemClick?: () => void
	itemUrl?: () => string | undefined
}

export default function BadgeCell<Field extends string>({
	binding,
	value,
	onItemClick,
	itemUrl,
}: Props<Field>) {
	const { isEditing } = useMetadataEditorContext()

	if (isEditing) {
		return <TextCell binding={binding} value={value} />
	}

	if (!value) return null

	const url = itemUrl?.()
	const badge = (
		<Badge
			key={value}
			onClick={isEditing ? undefined : () => onItemClick?.()}
			className={cn({
				'cursor-pointer': (onItemClick || !!url) && !isEditing,
			})}
		>
			{value}
		</Badge>
	)

	if (url) {
		const Component = url.startsWith('http') ? 'a' : Link
		const props = url.startsWith('http')
			? { href: url, target: '_blank', rel: 'noopener noreferrer' }
			: { to: url }
		return (
			// @ts-expect-error: TS doesn't understand I did this correctly lol
			<Component {...props} key={`${value}-link-wrapper`}>
				{badge}
			</Component>
		)
	}

	return badge
}
