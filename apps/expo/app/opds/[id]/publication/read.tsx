import { useKeepAwake } from 'expo-keep-awake'
import * as NavigationBar from 'expo-navigation-bar'
import { useEffect, useMemo, useState } from 'react'

import { ImageBasedReader } from '~/components/book/reader'
import { useReaderStore } from '~/stores'

import { hashFromURL } from '../../../../components/opds/utils'
import { usePublicationContext } from './context'

type ImageDimension = {
	height: number
	width: number
	ratio: number
}

export default function Screen() {
	useKeepAwake()
	const {
		publication: {
			metadata: { identifier, title },
			readingOrder = [],
		},
		url,
		progression,
	} = usePublicationContext()

	const [id] = useState(() => identifier || hashFromURL(url))

	const setIsReading = useReaderStore((state) => state.setIsReading)
	const setShowControls = useReaderStore((state) => state.setShowControls)

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

	useEffect(() => {
		setIsReading(true)
		return () => {
			setIsReading(false)
		}
	}, [setIsReading])

	useEffect(() => {
		return () => {
			setShowControls(false)
		}
	}, [setShowControls])

	useEffect(() => {
		NavigationBar.setVisibilityAsync('hidden')
		return () => {
			NavigationBar.setVisibilityAsync('visible')
		}
	}, [])

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
