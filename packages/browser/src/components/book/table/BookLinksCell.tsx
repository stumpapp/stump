import { Badge } from '@stump/components'
import { ExternalLink } from 'lucide-react'

type Props = {
	links: string[]
}

export default function BookLinksCell({ links }: Props) {
	const getBaseURL = (href: string) => {
		try {
			const url = new URL(href)

			return url.host
		} catch {
			return href
		}
	}

	if (!links.length) {
		return null
	}

	return (
		<div className="flex flex-wrap items-center gap-1.5">
			{links.map((href) => (
				<a key={href} href={href} target="_blank" rel="noopener noreferrer">
					<Badge size="sm">
						{getBaseURL(href)}
						<ExternalLink className="ml-1 h-3 w-3" />
					</Badge>
				</a>
			))}
		</div>
	)
}
