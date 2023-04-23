import { Divider, Heading, Label, RawSwitch, Text } from '@stump/components'
import { LibraryScanMode } from '@stump/types'
import { useFormContext } from 'react-hook-form'

import { Schema } from './CreateOrEditLibraryForm'

type Props = {
	isCreatingLibrary: boolean
}
export default function ScanModeForm({ isCreatingLibrary }: Props) {
	const form = useFormContext<Schema>()

	const [scanMode] = form.watch(['scan_mode'])

	const handleChangeScanMode = (newMode: LibraryScanMode) => {
		if (newMode === scanMode) {
			form.setValue('scan_mode', 'NONE')
		} else {
			form.setValue('scan_mode', newMode)
		}
	}

	return (
		<div className="py-2">
			<Heading size="xs">Scan Mode</Heading>
			<Text size="sm" variant="muted" className="mt-1.5 max-w-4xl">
				Choose how you want to scan your library{' '}
				{isCreatingLibrary
					? 'once it is registered in the database'
					: 'once your edits are persisted'}
				. You may skip the scan entirely if you would rather perform a scan manually at later time.
			</Text>

			<Divider variant="muted" className="my-3.5" />

			<div className="flex max-w-2xl flex-col gap-3 divide-y divide-gray-75 py-2 dark:divide-gray-900">
				<div className="flex items-center justify-between py-6 md:items-start">
					<RawSwitch
						className="text-gray-900"
						checked={scanMode === 'BATCHED'}
						onClick={() => handleChangeScanMode('BATCHED')}
						primaryRing
					/>

					<div className="flex flex-grow flex-col gap-2 text-right">
						<Label>Parallel Scan</Label>
						<Text size="xs" variant="muted">
							A faster scan that indexes your library files in parallel
						</Text>
					</div>
				</div>

				<div className="flex items-center justify-between py-6 md:items-start">
					<RawSwitch
						className="text-gray-900"
						checked={scanMode === 'SYNC'}
						onClick={() => handleChangeScanMode('SYNC')}
						primaryRing
					/>

					<div className="flex flex-grow flex-col gap-2 text-right">
						<Label>In-Order Scan</Label>
						<Text size="xs" variant="muted">
							A standard scan that indexes your library files one at a time
						</Text>
					</div>
				</div>
			</div>
		</div>
	)
}
