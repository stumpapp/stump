import { useSDK } from '@stump/client'
import { OPDSProgressionInput } from '@stump/sdk'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import * as Application from 'expo-application'
import { useKeepAwake } from 'expo-keep-awake'
import * as NavigationBar from 'expo-navigation-bar'
import { useFocusEffect } from 'expo-router'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Platform } from 'react-native'

import { useActiveServer } from '~/components/activeServer'
import { ImageBasedReader } from '~/components/book/reader'
import { ImageReaderBookRef } from '~/components/book/reader/image/context'
import { hashFromURL, useResolveURL } from '~/components/opds/utils'
import { useAppState } from '~/lib/hooks'
import { useReaderStore } from '~/stores'
import { useBookPreferences, useBookTimer } from '~/stores/reader'

import { usePublicationContext } from './context'

// TODO(opds): We need to add ALL the progression tracking enhancements I made to the online/offline readers
// to this one as well. I'm tired now though lol. Part of the problem is that determining the reader to use
// is less straightforward, it might just wind up being that as part of downloads I can take an optional
// progressionUrl or something so that the syncing locic in downloads can use it for OPDS servers

export default function Screen() {
	useKeepAwake()
	const {
		publication: {
			metadata: { identifier, title },
			readingOrder = [],
		},
		url,
		progression,
		progressionURL,
	} = usePublicationContext()
	const { sdk } = useSDK()
	const {
		activeServer: { id: serverId },
	} = useActiveServer()

	const [id] = useState(() => identifier || hashFromURL(url))

	const book = useMemo(
		() =>
			({
				id,
				name: title,
				pages: readingOrder?.length || 0,
				...(readingOrder?.length
					? {
							analysisData: {
								__typename: 'MediaAnalysisData',
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
				thumbnail: {
					// TODO: Try pull from json instead, too tired now
					url: readingOrder?.[0]?.href || '',
				},
				extension: 'unknown',
			}) satisfies ImageReaderBookRef,
		[id, title, readingOrder],
	)

	const {
		preferences: { trackElapsedTime },
	} = useBookPreferences({ book })
	const { pause, resume, isRunning, reset } = useBookTimer(id, {
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
		const extractedPosition = progression?.locator.locations?.at(0)?.position
		if (!extractedPosition) {
			return 1
		}
		return extractedPosition
	}, [progression])

	// TODO: Consider a store for device info? If more areas need it I guess
	const [deviceId, setDeviceId] = useState<string | null>(null)
	useEffect(() => {
		async function getDeviceId() {
			if (Platform.OS === 'ios') {
				setDeviceId(await Application.getIosIdForVendorAsync())
			} else {
				setDeviceId(Application.getAndroidId())
			}
		}
		getDeviceId()
	}, [])

	const queryClient = useQueryClient()
	const lastPageRef = useRef<number | null>(null)

	const { mutate: updateProgression } = useMutation({
		retry: (attempts) => attempts < 3,
		onError: (error) => {
			console.error('Failed to update OPDS progression:', error)
		},
		mutationFn: async ({ url, input }: { url: string; input: OPDSProgressionInput }) => {
			return sdk.opds.updateProgression(url, input)
		},
	})

	const onPageChanged = useCallback(
		(page: number) => {
			if (!progressionURL || !deviceId) {
				return
			}

			const progression = readingOrder?.length
				? Math.round((page / readingOrder.length) * 100) / 100
				: undefined

			lastPageRef.current = page
			const currentLink = readingOrder?.[page - 1]
			const input: OPDSProgressionInput = {
				modified: new Date().toISOString(),
				device: {
					id: deviceId,
					// TODO(opds): Allow user to set device name in settings?
					name: `Stump App - ${Platform.OS === 'ios' ? 'iOS' : 'Android'}`,
				},
				locator: {
					href: currentLink?.href || `#page-${page}`,
					type: currentLink?.type || 'image/jpeg',
					locations: {
						position: page,
						// Note: progression and totalProgression are the same for image-based readers
						progression,
						totalProgression: progression,
					},
				},
			}

			updateProgression({ url: progressionURL, input })
		},
		[progressionURL, deviceId, readingOrder, updateProgression],
	)

	useFocusEffect(
		useCallback(() => {
			return () => {
				if (progressionURL) {
					queryClient.invalidateQueries({
						queryKey: [sdk.opds.keys.progression, progressionURL],
					})
				}
			}
		}, [progressionURL, queryClient, sdk.opds.keys.progression]),
	)

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

	const getPageURL = useResolveURL()

	return (
		<ImageBasedReader
			serverId={serverId}
			initialPage={currentPage}
			book={book}
			pageURL={(page: number) => getPageURL(readingOrder![page - 1]?.href || '')}
			requestHeaders={requestHeaders}
			resetTimer={reset}
			onPageChanged={progressionURL ? onPageChanged : undefined}
			isOPDS
		/>
	)
}
