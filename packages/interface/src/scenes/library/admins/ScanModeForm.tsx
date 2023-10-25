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
				. This is optional, and can be done later
			</Text>

			<Divider variant="muted" className="my-3.5" />

			<RadioGroup value={scanMode} onValueChange={handleChange} className="max-w-2xl gap-4">
				<RadioGroup.CardItem
					label="Default scan"
					description="A standard scan that indexes your library files one at a time"
					innerContainerClassName="block sm:flex-col sm:items-start sm:gap-2"
					isActive={scanMode === 'DEFAULT'}
					value="DEFAULT"
				/>

				<RadioGroup.CardItem
					label="Skip the scan"
					description="You can perform a scan manually at a later time"
					innerContainerClassName="block sm:flex-col sm:items-start sm:gap-2"
					isActive={scanMode === 'NONE'}
					value="NONE"
				/>
			</RadioGroup>
		</div>
	)
}
