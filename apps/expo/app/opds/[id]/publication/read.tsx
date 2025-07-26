import { useKeepAwake } from 'expo-keep-awake'
import * as NavigationBar from 'expo-navigation-bar'
import { useCallback, useEffect, useMemo, useState } from 'react'

import { ImageBasedReader } from '~/components/book/reader'
import { ImageBasedBookPageRef } from '~/components/book/reader/image'
import { useAppState } from '~/lib/hooks'
import { useReaderStore } from '~/stores'
import { useBookPreferences, useBookTimer } from '~/stores/reader'

import { hashFromURL } from '../../../../components/opds/utils'
import { usePublicationContext } from './context'

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

	const {
		preferences: { trackElapsedTime },
	} = useBookPreferences(id)
	const { pause, resume, isRunning } = useBookTimer(id, {
		enabled: trackElapsedTime,
	})

	const onFocusedChanged = useCallback(
		(focused: boolean) => {
			if (!focused) {
				pause()
			} else if (focused) {
				resume()
			}
		},
		[pause, resume],
	)

	const appState = useAppState({
		onStateChanged: onFocusedChanged,
	})

	const showControls = useReaderStore((state) => state.showControls)
	useEffect(() => {
		if ((showControls && isRunning) || appState !== 'active') {
			pause()
		} else if (!showControls && !isRunning && appState === 'active') {
			resume()
		}
	}, [showControls, pause, resume, isRunning, appState])

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

	const imageSizes = useMemo(
		() =>
			readingOrder
				.filter(({ height, width }) => height && width)
				?.map(
					({ height, width }) =>
						({
							height,
							width,
							ratio: (width as number) / (height as number),
						}) as ImageBasedBookPageRef,
				)
				.reduce(
					(acc, ref, index) => {
						acc[index] = ref
						return acc
					},
					{} as Record<number, ImageBasedBookPageRef>,
				),
		[readingOrder],
	)

	return (
		<ImageBasedReader
			initialPage={currentPage}
			book={{
				id,
				name: title,
				pages: readingOrder.length,
			}}
			imageSizes={imageSizes}
			pageURL={(page: number) => readingOrder[page - 1].href}
		/>
	)
}
