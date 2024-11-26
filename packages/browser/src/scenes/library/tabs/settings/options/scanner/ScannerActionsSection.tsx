import { useQuery, useSDK } from '@stump/client'
import { Button, Label, Text } from '@stump/components'

import { useLibraryContext } from '@/scenes/library/context'

import { useLibraryManagement } from '../../context'

export default function ScannerActionsSection() {
	const { scan } = useLibraryManagement()
	const {
		library: { id },
	} = useLibraryContext()
	const { sdk } = useSDK()

	const { data } = useQuery(
		[sdk.library.keys.lastScanDetails, id],
		() => sdk.library.lastScanDetails(id),
		{ suspense: true, enabled: !!scan },
	)

	if (!scan) return null

	const lastScan = data?.last_custom_scan

	return (
		<div className="flex flex-col gap-y-6">
			<div className="flex flex-col gap-y-3">
				<div>
					<Label className="text-base">Default scan</Label>
					<Text variant="muted">A standard scan to index your library for new content</Text>
				</div>
				<div>
					<Button size="sm" onClick={scan}>
						Default scan
					</Button>
				</div>
			</div>

			<div className="flex flex-col gap-y-3">
				<div>
					<Label className="text-base">Custom scan</Label>
					<Text variant="muted">A scan with additional options for more fine-grained control</Text>
				</div>

				{lastScan && <div className="rounded-lg bg-background-surface p-1">config</div>}

				<div>
					<Button size="sm">Configure scan</Button>
				</div>
			</div>
		</div>
	)
}
