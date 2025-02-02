import { useLibraryByID, useSDK } from '@stump/client'
import { Badge, Label, Sheet, Text } from '@stump/components'
import { useLocaleContext } from '@stump/i18n'
import { APIKey, LibraryScanRecord } from '@stump/sdk'
import dayjs from 'dayjs'
import { KeyRound, Sparkles } from 'lucide-react'

import { useAppContext } from '@/context'
import { useCurrentOrPrevious } from '@/hooks/useCurrentOrPrevious'

type Props = {
	record: LibraryScanRecord | null
	onClose: () => void
}

export default function ScanRecordInspector({ record, onClose }: Props) {
	const { t } = useLocaleContext()
	const { sdk } = useSDK()
	const { library } = useLibraryByID(record?.library_id || '', {
		enabled: !!record,
	})

	const displayedData = useCurrentOrPrevious(record)

	const config = displayedData?.options
	const scannedAt = dayjs(displayedData?.timestamp)

	// 	return (
	// 		<div
	// 			className="mx-4 my-2 flex flex-col space-y-1.5 rounded-lg bg-background-surface p-[3px]"
	// 			data-testid="permissions-meta"
	// 		>
	// 			<div className="flex items-center px-2.5 py-0.5 text-foreground-subtle/80">
	// 				<KeyRound className="mr-2 h-4 w-4" />
	// 				{/* <span className="font-medium">{t(getSharedKey('fields.permissions'))}</span> */}
	// 			</div>
	// 			<div className="rounded-lg bg-background-surface-secondary p-2.5">
	// 				<div className="flex flex-wrap gap-2">

	// 				</div>
	// 			</div>
	// 		</div>
	// 	)
	// }

	return (
		<Sheet
			open={!!record}
			onClose={onClose}
			title="Scan record"
			description="A detailed view of this scan record"
		>
			<div className="flex flex-col">
				<div className="px-4 py-2" data-testid="lib-meta">
					<Label className="text-foreground-muted">Library</Label>
					{library ? (
						<Text size="sm">{library.name}</Text>
					) : (
						<div className="h-6 w-32 animate-pulse rounded-md bg-background-surface-hover" />
					)}
				</div>

				<div className="px-4 py-2" data-testid="name-meta">
					<Label className="text-foreground-muted">Date</Label>
					<Text size="sm">{scannedAt.format('LLL')}</Text>
				</div>

				{displayedData?.options?.config && (
					<div className="flex flex-col gap-y-3 px-4 py-2">
						<Label className="text-foreground-muted">Config</Label>
						<div className="rounded-xl bg-background-surface p-4">
							<pre className="text-xs text-foreground-muted">
								{JSON.stringify(displayedData.options.config, null, 2)}
							</pre>
						</div>
					</div>
				)}
			</div>
		</Sheet>
	)
}
