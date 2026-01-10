import { Link, Text } from '@stump/components'

import { FilterInput } from './filters/context'

type Props = {
	search?: FilterInput
	text: string
}

export default function SearchLinkBadge({ search, text }: Props) {
	const href = '/books?filters=' + encodeURIComponent(JSON.stringify(search || {}))
	const renderText = '     ' + text

	if (!search) {
		return <Text>{renderText}</Text>
	} else {
		return (
			<Text>
				<Link href={href} rel="noopener noreferrer" className="flex items-center">
					{renderText}
				</Link>
			</Text>
		)
	}
}
