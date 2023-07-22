import { Divider, Heading, RadioGroup, Text } from '@stump/components'
import { LibraryScanMode } from '@stump/types'
import { useFormContext } from 'react-hook-form'

import { Schema } from './CreateOrEditLibraryForm'

type Props = {
	isCreatingLibrary: boolean
}
export default function ScanModeForm({ isCreatingLibrary }: Props) {
	const form = useFormContext<Schema>()

	const [scanMode] = form.watch(['scan_mode'])

	const handleChange = (newMode: LibraryScanMode) => {
		form.setValue('scan_mode', newMode)
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

			<RadioGroup value={scanMode} onValueChange={handleChange} className="max-w-2xl gap-4">
				<RadioGroup.CardItem
					label="Skip the scan"
					description="You can perform a scan manually at a later time."
					innerContainerClassName="block sm:flex-col sm:items-start sm:gap-2"
					isActive={scanMode === 'NONE'}
					value="NONE"
				/>

				<RadioGroup.CardItem
					label="Parallel scan"
					description="A faster scan that indexes your library files in parallel."
					innerContainerClassName="block sm:flex-col sm:items-start sm:gap-2"
					isActive={scanMode === 'BATCHED'}
					value="BATCHED"
				/>

				<RadioGroup.CardItem
					label="In-order scan"
					description="A standard scan that indexes your library files one at a time."
					innerContainerClassName="block sm:flex-col sm:items-start sm:gap-2"
					isActive={scanMode === 'SYNC'}
					value="SYNC"
				/>
			</RadioGroup>
		</div>
	)
}
