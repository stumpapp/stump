import { Badge, Link } from '@stump/components'
import { ExternalLink } from 'lucide-react'
import React from 'react'

type Props = {
	href: string
	text?: string
}
export default function LinkBadge({ href, text }: Props) {
	const renderText = () => {
		if (text) {
			return text
		}

		const url = new URL(href)
		return url.hostname
	}

	return (
		<Badge className="line-clamp-1 flex items-center" size="sm">
			<Link href={href} target="_blank" rel="noopener noreferrer" className="flex items-center">
				{renderText()}
				<ExternalLink className="ml-1 h-3 w-3 flex-shrink-0" />
			</Link>
		</Badge>
	)
}
