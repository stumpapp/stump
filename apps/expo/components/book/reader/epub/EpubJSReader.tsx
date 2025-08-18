import { Location, Reader, Theme } from '@epubjs-react-native/core'
import { useFileSystem } from '@epubjs-react-native/expo-file-system'
import { useSDK } from '@stump/client'
import { useColorScheme } from 'nativewind'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { useDisplay } from '~/lib/hooks'

import { EbookReaderBookRef } from '../image/context'
import EpubJSReaderContainer from './EpubJSReaderContainer'

type Props = {
	/**
	 * The media which is being read
	 */
	book: EbookReaderBookRef
	/**
	 * The initial CFI to start the reader on
	 */
	initialCfi?: string
	/**
	 * Whether the reader should be in incognito mode
	 */
	incognito?: boolean

	onEpubCfiChanged: (cfi: string, percentage: number) => void
}

/**
 * A reader for books that are EPUBs, using EpubJS as the reader
 *
 * TODO: create a custom reader component, this is a HUGE effort but will pay off in
 * the long run
 */
export default function EpubJSReader({ book, initialCfi, incognito, onEpubCfiChanged }: Props) {
	const { width, height } = useDisplay()
	const { colorScheme } = useColorScheme()
	const { sdk } = useSDK()
	/**
	 * The base64 representation of the book file. The reader component does not accept
	 * credentials in the fetch, so we just have to fetch manually and pass the base64
	 * representation to the reader as the source.
	 */
	const [base64, setBase64] = useState<string | null>(null)

	const defaultTheme = useMemo(
		() =>
			(colorScheme === 'dark'
				? {
						body: { background: '#0F1011 !important', color: '#E8EDF4' },
					}
				: { body: { color: 'black' } }) as Theme,
		[colorScheme],
	)

	const insets = useSafeAreaInsets()

	/**
	 * An effect that fetches the book file and loads it into the reader component
	 * as a base64 string
	 */
	useEffect(() => {
		async function fetchBook() {
			try {
				const response = await fetch(sdk.media.downloadURL(book.id), {
					headers: {
						...sdk.customHeaders,
						Authorization: sdk.authorizationHeader || '',
					},
				})
				const data = await response.blob()
				const reader = new FileReader()
				reader.onloadend = () => {
					const result = reader.result as string
					// Note: uncomment this line to show an infinite loader...
					// setBase64(result)
					const adjustedResult = result.split(',')[1] || result
					setBase64(adjustedResult)
				}
				reader.readAsDataURL(data)
			} catch (e) {
				console.error(e)
			}
		}

		if (!base64) {
			fetchBook()
		}
	}, [book.id, sdk, base64])

	/**
	 * A callback that updates the read progress of the current location
	 *
	 * If the reader is in incognito mode, this will do nothing.
	 */
	const handleLocationChanged = useCallback(
		async (_: number, currentLocation: Location, progress: number) => {
			if (!incognito) {
				const {
					start: { cfi },
				} = currentLocation

				onEpubCfiChanged(cfi, progress)
			}
		},
		[incognito, onEpubCfiChanged],
	)

	if (!base64) {
		return null
	}

	return (
		<EpubJSReaderContainer>
			<Reader
				src={base64}
				onDisplayError={(error) => console.error(error)}
				width={width}
				// height={height - height * 0.08}
				height={height - (insets.top + insets.bottom)}
				fileSystem={useFileSystem}
				initialLocation={initialCfi}
				onLocationChange={handleLocationChanged}
				// renderLoadingFileComponent={LoadingSpinner}
				defaultTheme={defaultTheme}
			/>
		</EpubJSReaderContainer>
	)
}
