import { useSDK } from '@stump/client'
import { eq } from 'drizzle-orm'
import { useLiveQuery } from 'drizzle-orm/expo-sqlite'
import { useKeepAwake } from 'expo-keep-awake'
import * as NavigationBar from 'expo-navigation-bar'
import { useLocalSearchParams } from 'expo-router'
import { useCallback, useEffect, useMemo } from 'react'

import { useActiveServer } from '~/components/activeServer'
import { ImageBasedReader } from '~/components/book/reader'
import { ImageReaderBookRef } from '~/components/book/reader/image/context'
import { useResolveURL } from '~/components/opds/utils'
import { OPDSLegacyStreamingContextValue } from '~/context/opdsLegacy'
import { db, downloadedFiles, readProgress, syncStatus } from '~/db'
import { useAppState } from '~/lib/hooks'
import { useReaderStore } from '~/stores'
import { useBookPreferences, useBookTimer } from '~/stores/reader'

type Params = Omit<OPDSLegacyStreamingContextValue, 'pageCount'> & {
	pageCount: string // conform to Route params, reqs being a string
}

export default function Screen() {
	useKeepAwake()

	const params = useLocalSearchParams<Params>()

	const contextValue = useMemo(
		() => ({
			...params,
			pageCount: getValidNumber(params.pageCount),
		}),
		[params],
	)

	const { sdk } = useSDK()
	const {
		activeServer: { id: serverId },
	} = useActiveServer()
	const {
		data: [record],
		updatedAt,
	} = useLiveQuery(
		db.select().from(downloadedFiles).where(eq(downloadedFiles.id, params.entryId)).limit(1),
		[params.entryId],
	)
	const isLoadingRecord = updatedAt == null

	const resolveUrl = useResolveURL()

	/**
	 * Get the streaming URL for a specific page
	 *
	 * @param pageNumber 1-based page
	 * @returns streaming URL for the page
	 * @throws Error if the streaming URL format is unsupported or the URL is not valid
	 */
	const getStreamURLForPage = useCallback(
		(pageNumber: number) => {
			const streamingURL = resolveUrl(contextValue.streamingURL)

			const urlObj = new URL(streamingURL)
			const zeroBasedParam =
				urlObj.searchParams.get('zero_based') || urlObj.searchParams.get('zeroBased')
			const isZeroBased = zeroBasedParam === 'true'
			const actualPageNumber = isZeroBased ? pageNumber - 1 : pageNumber

			if (streamingURL.includes('{pageNumber}')) {
				return streamingURL.replace('{pageNumber}', actualPageNumber.toString())
			} else {
				throw new Error('Unsupported streaming URL format')
			}
		},
		[resolveUrl, contextValue.streamingURL],
	)

	const book = useMemo(
		() =>
			({
				id: contextValue.entryId,
				name: contextValue.entryTitle,
				pages: contextValue.pageCount,
				nextInSeries: { nodes: [] },
				thumbnail: {
					url: getStreamURLForPage(1),
				},
				extension: 'unknown',
			}) satisfies ImageReaderBookRef,
		[contextValue, getStreamURLForPage],
	)

	const {
		preferences: { trackElapsedTime },
	} = useBookPreferences({ book })

	const { pause, resume, isRunning, totalSeconds, reset } = useBookTimer(contextValue.entryId, {
		enabled: trackElapsedTime,
	})

	const onPageChanged = useCallback(
		async (pageNumber: number) => {
			if (isLoadingRecord || !record) return
			return db
				.insert(readProgress)
				.values({
					bookId: record.id,
					serverId: record.serverId,
					page: pageNumber,
					elapsedSeconds: totalSeconds,
					lastModified: new Date(),
				})
				.onConflictDoUpdate({
					target: readProgress.bookId,
					set: {
						page: pageNumber,
						elapsedSeconds: totalSeconds,
						lastModified: new Date(),
						syncStatus: syncStatus.enum.UNSYNCED,
					},
				})
		},
		[isLoadingRecord, record, totalSeconds],
	)

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

	const requestHeaders = useCallback(
		() => ({
			...sdk.customHeaders,
			Authorization: sdk.authorizationHeader || '',
		}),
		[sdk],
	)

	useEffect(() => {
		NavigationBar.setVisibilityAsync('hidden')
		return () => {
			NavigationBar.setVisibilityAsync('visible')
		}
	}, [])

	return (
		<ImageBasedReader
			serverId={serverId}
			initialPage={1}
			book={book}
			pageURL={getStreamURLForPage}
			requestHeaders={requestHeaders}
			resetTimer={reset}
			onPageChanged={onPageChanged}
			isOPDS
		/>
	)
}

const getValidNumber = (value: string) => {
	const parsed = parseInt(value, 10)
	return isNaN(parsed) ? -1 : parsed
}
