import { useKeepAwake } from 'expo-keep-awake'
import * as NavigationBar from 'expo-navigation-bar'
import { useCallback, useEffect, useMemo, useState } from 'react'

import { ImageBasedReader } from '~/components/book/reader'
import { ImageReaderBookRef } from '~/components/book/reader/image/context'
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

	const book = useMemo(
		() =>
			({
				id,
				name: title,
				pages: readingOrder?.length || 0,
				...(readingOrder?.length
					? {
							pageAnalysis: {
								__typename: 'PageAnalysis',
								dimensions: readingOrder
									.filter(({ height, width }) => height != null && width != null)
									.map(({ height, width }) => ({
										height: height as number,
										width: width as number,
									})),
							},
						}
					: {}),
				nextInSeries: { nodes: [] },
			}) satisfies ImageReaderBookRef,
		[id, title, readingOrder],
	)

	const {
		preferences: { trackElapsedTime },
	} = useBookPreferences({ book })
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

	return (
		<ImageBasedReader
			initialPage={currentPage}
			book={book}
			pageURL={(page: number) => readingOrder![page - 1]?.href}
			isOPDS
		/>
	)
}
