import { Heading, Text } from '@stump/components'
import { Suspense } from 'react'

import ScanHistoryTable from './ScanHistoryTable'

export default function ScanningSection() {
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

				{/* <CreateAPIKeyModal /> */}
			</div>

			<Suspense>
				<ScanHistoryTable />
			</Suspense>
		</div>
	)
}
