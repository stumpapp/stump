import { queryClient, useMutation, useSDK } from '@stump/client'
import { Button, Heading, Text } from '@stump/components'
import { LibraryScanRecord } from '@stump/sdk'
import { Suspense, useEffect, useState } from 'react'

import { useLibraryManagement } from '../../../context'
import ScanHistoryTable from './ScanHistoryTable'

export default function ScanningSection() {
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
					<Heading size="sm">
						{/* {t(getKey('title'))} */}
						Scan History
					</Heading>
					<Text size="sm" variant="muted" className="mt-1">
						{/* {t(getKey('description'))} */}
						The history of all scans recorded for this library
					</Text>
				</div>

				<div className="flex justify-end">
					<Button variant="secondary" onClick={() => clearHistory()} disabled={isNoHistory}>
						Delete scan history
					</Button>
				</div>
			</div>

			<Suspense>
				<ScanHistoryTable />
			</Suspense>
		</div>
	)
}
