import { Button, Dialog } from '@stump/components'
import { ScanOptions } from '@stump/sdk'
import { useCallback, useState } from 'react'

import ScanConfigForm, { FORM_ID } from './ScanConfigForm'

type Props = {
	onScan: (options: ScanOptions) => void
}

export default function CustomScanDialog({ onScan }: Props) {
	const [isOpen, setIsOpen] = useState(false)

	const handleScan = useCallback(
		(options: ScanOptions) => {
			onScan(options)
			setIsOpen(false)
		},
		[onScan],
	)

	return (
		<Dialog open={isOpen} onOpenChange={setIsOpen}>
			<Dialog.Trigger asChild>
				<Button size="sm">Configure scan</Button>
			</Dialog.Trigger>
			<Dialog.Content>
				<Dialog.Header>
					<Dialog.Title>Configure scan</Dialog.Title>
					<Dialog.Description>
						A scan with additional options for more fine-grained control
					</Dialog.Description>
				</Dialog.Header>

				<ScanConfigForm onScan={handleScan} />

				<Dialog.Footer>
					<Button onClick={() => setIsOpen(false)}>Cancel</Button>
					<Button type="submit" form={FORM_ID}>
						Scan
					</Button>
				</Dialog.Footer>
			</Dialog.Content>
		</Dialog>
	)
}
