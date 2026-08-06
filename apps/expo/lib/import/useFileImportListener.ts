import * as Sentry from '@sentry/react-native'
import * as Linking from 'expo-linking'
import { router } from 'expo-router'
import { useCallback, useEffect, useRef } from 'react'
import { Alert } from 'react-native'

import { useDownloadsState } from '~/components/localLibrary/store'
import { useTranslate } from '~/lib/hooks/useTranslate'

import { importLocalFile } from './importFile'

export function useFileImportListener() {
	const { t } = useTranslate()
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
				const result = await importLocalFile(url, t)

				if (result.success) {
					increment()

					Alert.alert(
						t('fileImport.importedTitle'),
						t('fileImport.importedDescription', {
							filename: result.filename,
						}),
						[
							{ text: t('fileImport.viewLibrary'), onPress: () => router.push('/library') },
							{ text: t('fileImport.ok') },
						],
					)
				} else {
					Sentry.captureMessage('File import failed', { extra: { url, error: result.error } })
					Alert.alert(t('fileImport.failedTitle'), result.error)
				}
			} catch (error) {
				Sentry.captureException(error, { extra: { url } })
				Alert.alert(t('fileImport.errorTitle'), t('fileImport.failedFallback'))
			} finally {
				processingRef.current = false
			}
		},
		[increment, t],
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
