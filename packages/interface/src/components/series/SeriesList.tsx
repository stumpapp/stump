import { Heading } from '@stump/components'
import type { Series } from '@stump/types'

import ListItem from '../ListItem'

interface Props {
	isLoading: boolean
	series?: Series[]
}

export default function SeriesList({ series, isLoading }: Props) {
	if (isLoading) {
		return null
	} else if (!series || !series.length) {
		return (
			<div className="flex flex-1 items-center justify-center">
				{/* TODO: If I take in pageData, I can determine if it is an out of bounds issue or if the series truly has
				no media. */}
				<Heading size="sm">It doesn&rsquo;t look like there are any series here.</Heading>
			</div>
		)
	}

	return (
		<div className="flex flex-1 flex-col space-y-2">
			{series.map(({ id, name, description }, i) => (
				<ListItem
					key={id}
					id={id}
					title={name}
					subtitle={description}
					href={`/series/${id}`}
					even={i % 2 === 0}
				/>
			))}
		</div>
	)
}
