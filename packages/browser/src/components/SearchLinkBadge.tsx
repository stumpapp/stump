import { Link, Text } from '@stump/components'

type Props = {
	searchKey: string
	text: string
}

export default function SearchLinkBadge({ searchKey, text }: Props) {
	const href = '/books?' + encodeURIComponent(searchKey) + '=' + encodeURIComponent(text)
	const renderText = '     ' + text

	return (
		<Text>
			<Link href={href} rel="noopener noreferrer" className="flex items-center">
				{renderText}
			</Link>
		</Text>
	)
}
