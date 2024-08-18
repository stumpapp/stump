import { cx, Heading, Text } from '@stump/components'
import { Link } from 'react-router-dom'

interface Props {
	id: string
	title: string
	subtitle?: string | null
	href: string
	even?: boolean
}

// Used to render the items in the series list and media list
export default function ListItem({ id, title, subtitle, href }: Props) {
	return (
		<Link
			tabIndex={0}
			title={title}
			key={id}
			to={href}
			className="flex h-[40px] w-full rounded-lg p-2 hover:bg-background-surface"
		>
			<Heading
				size="sm"
				className={cx(
					'line-clamp-1 shrink-0',
					{ ' w-1/2 md:w-1/3 lg:w-1/4 xl:w-[23%]': !!subtitle },
					{ 'w-full': !subtitle },
				)}
			>
				{title}
			</Heading>

			<Text size="sm" className="line-clamp-1 flex-1" variant="muted">
				{subtitle}
			</Text>
		</Link>
	)
}
