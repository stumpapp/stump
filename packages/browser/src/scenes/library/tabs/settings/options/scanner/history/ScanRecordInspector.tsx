import { useLibraryByID, useQuery, useSDK } from '@stump/client'
import { Alert, ButtonOrLink, Label, Sheet, Text } from '@stump/components'
import { useLocaleContext } from '@stump/i18n'
import { LibraryScanRecord } from '@stump/sdk'
import dayjs from 'dayjs'

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
	const { data: job } = useQuery(
		[sdk.job.keys.getByID, record?.job_id],
		() => sdk.job.getByID(record?.job_id || ''),
		{
			enabled: !!record?.job_id,
		},
	)

	const displayedData = useCurrentOrPrevious(record)

	const scannedAt = dayjs(displayedData?.timestamp)

	return (
		<Sheet
			open={!!record}
			onClose={onClose}
			title={t(getKey('title'))}
			description={t(getKey('description'))}
		>
			<div className="flex flex-col">
				<div className="px-4 py-2" data-testid="lib-meta">
					<Label className="text-foreground-muted">{t(getFieldKey('library'))}</Label>
					{library ? (
						<Text size="sm">{library.name}</Text>
					) : (
						<div className="h-6 w-32 animate-pulse rounded-md bg-background-surface-hover" />
					)}
				</div>

				<div className="px-4 py-2" data-testid="name-meta">
					<Label className="text-foreground-muted">{t(getFieldKey('date'))}</Label>
					<Text size="sm">{scannedAt.format('LLL')}</Text>
				</div>

				{displayedData?.options?.config && (
					<div className="flex flex-col gap-y-3 px-4 py-2">
						<Label className="text-foreground-muted">{t(getFieldKey('config'))}</Label>
						<div className="rounded-xl bg-background-surface p-4">
							<pre className="text-xs text-foreground-muted">
								{JSON.stringify(displayedData.options.config, null, 2)}
							</pre>
						</div>
					</div>
				)}

				{job?.output_data && (
					<div className="flex flex-col gap-y-3 px-4 py-2">
						<Label className="text-foreground-muted">{t(getFieldKey('jobOutput'))}</Label>
						<div className="rounded-xl bg-background-surface p-4">
							<pre className="text-xs text-foreground-muted">
								{JSON.stringify(job.output_data, null, 2)}
							</pre>
						</div>
					</div>
				)}

				{!!job?.logs?.length && (
					<div className="flex flex-col gap-y-3 px-4 py-2">
						<Label className="text-foreground-muted">{t(getFieldKey('logs'))}</Label>

						<Alert level="warning" className="p-2">
							<Alert.Content className="text-sm text-foreground-subtle">
								{t(getKey('logsPresent'))} ({job.logs.length})
							</Alert.Content>
						</Alert>

						<div>
							<ButtonOrLink href={`/settings/server/logs?job_id=${job.id}`} variant="secondary">
								{t(getFieldKey('seeLogs'))}
							</ButtonOrLink>
						</div>
					</div>
				)}
			</div>
		</Sheet>
	)
}

const LOCALE_BASE = 'librarySettingsScene.options/scanning.sections.history.inspector'
const getFieldKey = (key: string) => `${LOCALE_BASE}.fields.${key}`
const getKey = (key: string) => `${LOCALE_BASE}.${key}`
