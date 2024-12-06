import { Badge, Link } from '@stump/components'
import { ExternalLink } from 'lucide-react'

type Props = {
	href: string
	text?: string
}

export default function LinkBadge({ href, text }: Props) {
	const getHostname = (url: string) => {
		try {
			const parsedUrl = new URL(url)
			return parsedUrl.hostname
		} catch (error) {
			console.error('LinkBadge: Failed to parse URL', { error, url })
			return url
		}
	}

	const renderText = () => {
		if (text) {
			return text
		} else if (href) {
			return getHostname(href)
		} else {
			console.warn('LinkBadge: No href or text provided')
			return null
		}
	}

	const content = renderText()
	if (content === null) {
		return null
	}

	return (
		<Badge className="line-clamp-1 flex items-center" size="sm">
			<Link href={href} target="_blank" rel="noopener noreferrer" className="flex items-center">
				{content}
				<ExternalLink className="ml-1 h-3 w-3 flex-shrink-0" />
			</Link>
		</Badge>
	)
}
