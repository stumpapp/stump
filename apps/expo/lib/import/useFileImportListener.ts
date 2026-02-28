import * as Sentry from '@sentry/react-native'
import * as Linking from 'expo-linking'
import { router } from 'expo-router'
import { useCallback, useEffect, useRef } from 'react'
import { Alert } from 'react-native'

import { useDownloadsState } from '~/components/localLibrary/store'

import { importLocalFile } from './importFile'

export function useFileImportListener() {
	const increment = useDownloadsState((state) => state.increment)
	const processingRef = useRef(false)

	const handleIncomingUrl = useCallback(
		async (url: string | null) => {
			if (!url || (!url.startsWith('content://') && !url.startsWith('file://'))) {
				return
			}

			if (processingRef.current) return
			processingRef.current = true

			try {
				const result = await importLocalFile(url)

				if (result.success) {
					increment()

					Alert.alert('File Imported', `"${result.filename}" has been added to your library.`, [
						{ text: 'View Library', onPress: () => router.push('/library') },
						{ text: 'OK' },
					])
				} else {
					Sentry.captureMessage('File import failed', { extra: { url, error: result.error } })
					Alert.alert('Import Failed', result.error)
				}
			} catch (error) {
				Sentry.captureException(error, { extra: { url } })
				Alert.alert(
					'Import Error',
					error instanceof Error ? error.message : 'Failed to import file',
				)
			} finally {
				processingRef.current = false
			}
		},
		[increment],
	)

	useEffect(() => {
		// This is needed to handle file open event if app wasn't previously open
		Linking.getInitialURL().then(handleIncomingUrl)

		const subscription = Linking.addEventListener('url', ({ url }) => {
			handleIncomingUrl(url)
		})

		return () => subscription.remove()
	}, [handleIncomingUrl])
}
