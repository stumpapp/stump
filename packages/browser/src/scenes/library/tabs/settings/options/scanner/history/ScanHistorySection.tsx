import { Button, Heading, Text } from '@stump/components'
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

				<div className="flex justify-end">
					<Button variant="secondary" onClick={() => {}}>
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
