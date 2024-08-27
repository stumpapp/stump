import { Heading, RadioGroup, Text } from '@stump/components'
import { LibraryScanMode } from '@stump/types'
import { useFormContext } from 'react-hook-form'

import { CreateOrUpdateLibrarySchema } from '../schema'

type Props = {
	isCreatingLibrary?: boolean
}

export default function ScanModeForm({ isCreatingLibrary }: Props) {
	const form = useFormContext<CreateOrUpdateLibrarySchema>()

	const [scanMode] = form.watch(['scan_mode'])

	const handleChange = (newMode: LibraryScanMode) => {
		form.setValue('scan_mode', newMode)
	}

	return (
		<div className="flex flex-grow flex-col gap-6">
			<div>
				<Heading size="sm">Scan mode</Heading>
				<Text size="sm" variant="muted">
					Choose how you want to scan your library{' '}
					{isCreatingLibrary ? 'after it is created' : 'once your updates are stored'}
				</Text>
			</div>

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
