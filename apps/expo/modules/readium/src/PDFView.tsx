import { requireNativeView } from 'expo'
import React, { useCallback, useEffect, useImperativeHandle, useRef } from 'react'
import type { StyleProp, ViewStyle } from 'react-native'

import type { ReadiumLocator } from './Readium.types'

export type PDFScrollAxis = 'vertical' | 'horizontal'

export interface PDFViewProps {
	bookId: string
	url: string
	locator?: ReadiumLocator
	initialLocator?: ReadiumLocator
	backgroundColor?: string
	pageSpacing?: number
	scrollAxis?: PDFScrollAxis
	style?: StyleProp<ViewStyle>
	onLocatorChange?: (event: { nativeEvent: LocatorChangeEvent }) => void
	onPageChange?: (event: { nativeEvent: PageChangeEvent }) => void
	onBookLoaded?: (event: { nativeEvent: BookLoadedEvent }) => void
	onError?: (event: { nativeEvent: PDFErrorEvent }) => void
}

export interface LocatorChangeEvent {
	href: string
	title?: string
	locations?: Record<string, unknown>
	text?: Record<string, unknown>
	type?: string
}

export interface PageChangeEvent {
	currentPage: number
}

export interface BookLoadedEvent {
	success: boolean
	bookMetadata: {
		title: string
		author: string
		publisher: string
		identifier: string
		language: string
		totalPages: number
	}
}

export interface PDFErrorEvent {
	errorDescription: string
	failureReason: string
	recoverySuggestion: string
}

export interface PDFViewRef {
	goToLocation: (locator: ReadiumLocator) => Promise<void>
	goToPage: (page: number) => Promise<void>
	goForward: () => Promise<void>
	goBackward: () => Promise<void>
	destroy: () => Promise<void>
}

const NativePDFView = requireNativeView('Readium', 'PDFView')

export const PDFView = React.forwardRef<PDFViewRef, PDFViewProps>((props, ref) => {
	const {
		bookId,
		url,
		locator,
		initialLocator,
		backgroundColor = '#000000',
		pageSpacing = 0,
		scrollAxis = 'vertical',
		style,
		onLocatorChange,
		onPageChange,
		onBookLoaded,
		onError,
	} = props

	const nativeRef = useRef<PDFViewRef>(null)

	useImperativeHandle(
		ref,
		() => ({
			goToLocation: async (locator: ReadiumLocator) => {
				await nativeRef.current?.goToLocation(locator)
			},
			goToPage: async (page: number) => {
				await nativeRef.current?.goToPage(page)
			},
			goForward: async () => {
				await nativeRef.current?.goForward()
			},
			goBackward: async () => {
				await nativeRef.current?.goBackward()
			},
			destroy: async () => {
				await nativeRef.current?.destroy()
			},
		}),
		[],
	)

	useEffect(() => {
		const ref = nativeRef.current
		return () => {
			ref?.destroy()
		}
	}, [])

	const handleLocatorChange = useCallback(
		(event: { nativeEvent: LocatorChangeEvent }) => {
			onLocatorChange?.(event)
		},
		[onLocatorChange],
	)

	const handlePageChange = useCallback(
		(event: { nativeEvent: PageChangeEvent }) => {
			onPageChange?.(event)
		},
		[onPageChange],
	)

	const handleBookLoaded = useCallback(
		(event: { nativeEvent: BookLoadedEvent }) => {
			onBookLoaded?.(event)
		},
		[onBookLoaded],
	)

	const handleError = useCallback(
		(event: { nativeEvent: PDFErrorEvent }) => {
			onError?.(event)
		},
		[onError],
	)

	return (
		<NativePDFView
			ref={nativeRef}
			bookId={bookId}
			url={url}
			locator={locator}
			initialLocator={initialLocator}
			backgroundColor={backgroundColor}
			pageSpacing={pageSpacing}
			scrollAxis={scrollAxis}
			style={style}
			onLocatorChange={handleLocatorChange}
			onPageChange={handlePageChange}
			onBookLoaded={handleBookLoaded}
			onError={handleError}
		/>
	)
})

PDFView.displayName = 'PDFView'
