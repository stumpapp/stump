import { useMemo, useState } from 'react'

import { usePublicationContext } from './context'
import { ImageBasedReader } from '~/components/book/reader'
import { hashFromURL } from './utils'

type ImageDimension = {
	height: number
	width: number
	ratio: number
}

// TODO: refactor to use imagebasedreader when able
export default function Screen() {
	const {
		publication: {
			metadata: { identifier, title },
			readingOrder = [],
		},
		url,
		progression,
	} = usePublicationContext()

	const [id] = useState(() => identifier || hashFromURL(url))

	const currentPage = useMemo(() => {
		const rawPosition = progression?.locator.locations?.at(0)?.position
		if (!rawPosition) {
			return 1
		}
		const parsedPosition = parseInt(rawPosition, 10)
		if (isNaN(parsedPosition)) {
			return 1
		}
		return parsedPosition
	}, [progression])

	return (
		<ImageBasedReader
			initialPage={currentPage}
			book={{
				id,
				name: title,
				pages: readingOrder.length,
			}}
			imageSizes={
				readingOrder
					.filter(({ height, width }) => height && width)
					.map(({ height, width }) => ({
						height,
						width,
						ratio: (width as number) / (height as number),
					})) as ImageDimension[]
			}
			pageURL={(page: number) => readingOrder[page - 1].href}
		/>
	)
}
