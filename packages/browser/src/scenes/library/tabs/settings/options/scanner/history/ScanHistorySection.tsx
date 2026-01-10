import { useGraphQLMutation, useSDK } from '@stump/client'
import { Button, Heading, Text } from '@stump/components'
import { graphql, LibraryScanRecord } from '@stump/graphql'
import { useLocaleContext } from '@stump/i18n'
import { useQueryClient } from '@tanstack/react-query'
import { Suspense, useEffect, useState } from 'react'

import { useLibraryManagement } from '../../../context'
import ScanHistoryTable from './ScanHistoryTable'

const mutation = graphql(`
	mutation ScanHistorySectionClearHistory($id: ID!) {
		clearScanHistory(id: $id)
	}
`)

export default function ScanningSection() {
	const { t } = useLocaleContext()
	const { sdk } = useSDK()
	const {
		library: { id },
	} = useLibraryManagement()

	const client = useQueryClient()

	const { mutate: clearHistory } = useGraphQLMutation(mutation, {
		onSuccess: () => client.refetchQueries({ queryKey: sdk.cacheKey('scanHistory', [id]) }),
	})

	const [isNoHistory, setIsNoHistory] = useState(false)

	useEffect(() => {
		const unsubscribe = client.getQueryCache().subscribe(({ query: { queryKey } }) => {
			const [baseKey, libraryID] = queryKey
			if (baseKey === 'scanHistory' && libraryID === id) {
				const scanHistory = client.getQueryData<LibraryScanRecord[]>(queryKey)
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
	}, [id, client])

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
					<Button variant="secondary" onClick={() => clearHistory({ id })} disabled={isNoHistory}>
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
