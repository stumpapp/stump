import { queryClient, useMutation, useSDK } from '@stump/client'
import { Button, Heading, Text } from '@stump/components'
import { useLocaleContext } from '@stump/i18n'
import { LibraryScanRecord } from '@stump/sdk'
import { Suspense, useEffect, useState } from 'react'

import { useLibraryManagement } from '../../../context'
import ScanHistoryTable from './ScanHistoryTable'

export default function ScanningSection() {
	const { t } = useLocaleContext()
	const {
		library: { id },
	} = useLibraryManagement()
	const { sdk } = useSDK()

	const { mutate: clearHistory } = useMutation(
		[sdk.library.keys.clearScanHistory, id],
		() => sdk.library.clearScanHistory(id),
		{
			onSuccess: () => queryClient.invalidateQueries([sdk.library.keys.scanHistory, id]),
		},
	)

	const [isNoHistory, setIsNoHistory] = useState(false)

	useEffect(() => {
		const unsubscribe = queryClient.getQueryCache().subscribe(({ query: { queryKey } }) => {
			const [baseKey, libraryID] = queryKey
			if (baseKey === sdk.library.keys.scanHistory && libraryID === id) {
				const scanHistory = queryClient.getQueryData<LibraryScanRecord[]>(queryKey)
				if (!scanHistory?.length) {
					setIsNoHistory(true)
				} else {
					setIsNoHistory(false)
				}
			}
		})

		return () => {
			unsubscribe()
		}
	}, [sdk.library.keys.scanHistory, id])

	return (
		<div className="flex flex-col gap-4">
			<div className="flex items-end justify-between">
				<div>
					<Heading size="sm">{t(getKey('heading'))}</Heading>
					<Text size="sm" variant="muted" className="mt-1">
						{t(getKey('description'))}
					</Text>
				</div>

				<div className="flex shrink-0 justify-end">
					<Button variant="secondary" onClick={() => clearHistory()} disabled={isNoHistory}>
						{t(getKey('clearHistory'))}
					</Button>
				</div>
			</div>

			<Suspense>
				<ScanHistoryTable />
			</Suspense>
		</div>
	)
}

const LOCALE_BASE = 'librarySettingsScene.options/scanning.sections.history'
const getKey = (key: string) => `${LOCALE_BASE}.${key}`
