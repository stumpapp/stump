import { Button, Label, Text } from '@stump/components'

import { useLibraryManagement } from '../../context'
import CustomScanDialog from './customScan'

export default function ScannerActionsSection() {
	const { scan } = useLibraryManagement()

	if (!scan) return null

	return (
		<div className="flex flex-col gap-y-6">
			<div className="flex flex-col gap-y-3">
				<div>
					<Label className="text-base">Default scan</Label>
					<Text variant="muted">A standard scan to index your library for new content</Text>
				</div>
				<div>
					<Button size="sm" onClick={() => scan()}>
						Default scan
					</Button>
				</div>
			</div>

			<div className="flex flex-col gap-y-3">
				<div>
					<Label className="text-base">Custom scan</Label>
					<Text variant="muted">A scan with additional options for more fine-grained control</Text>
				</div>

				<div>
					<CustomScanDialog onScan={scan} />
				</div>
			</div>
		</div>
	)
}
