import { useGraphQL } from '@stump/client'
import { Alert, ButtonOrLink, Label, Sheet, Text } from '@stump/components'
import { graphql, UserPermission } from '@stump/graphql'
import { useLocaleContext } from '@stump/i18n'
import dayjs from 'dayjs'
import { useMemo } from 'react'

import { useAppContext } from '@/context'
import { useCurrentOrPrevious } from '@/hooks/useCurrentOrPrevious'

import { useLibraryManagement } from '../../../context'
import { LibraryScanRecord } from './ScanHistoryTable'

// TODO: finish selection for outputData

const query = graphql(`
	query ScanRecordInspectorJobs($id: ID!, $loadLogs: Boolean!) {
		jobById(id: $id) {
			id
			outputData {
				__typename
			}
			logs @include(if: $loadLogs) {
				id
			}
		}
	}
`)

type Props = {
	record: LibraryScanRecord | null
	onClose: () => void
}

export default function ScanRecordInspector({ record, onClose }: Props) {
	const { t } = useLocaleContext()
	const { checkPermission } = useAppContext()
	const {
		library: { name },
	} = useLibraryManagement()

	const loadAssociatedJob = useMemo(
		() => checkPermission(UserPermission.ReadJobs),
		[checkPermission],
	)
	const loadJobLogs = useMemo(
		() => loadAssociatedJob && checkPermission(UserPermission.ReadPersistedLogs),
		[loadAssociatedJob, checkPermission],
	)
	const { data } = useGraphQL(
		query,
		['jobById', record?.jobId],
		{
			id: record?.jobId || '',
			loadLogs: loadJobLogs,
		},
		{
			enabled: !!record?.jobId && loadAssociatedJob,
		},
	)
	const associatedJob = useMemo(() => data?.jobById, [data])

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
					{record ? (
						<Text size="sm">{name}</Text>
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

				{associatedJob?.outputData && (
					<div className="flex flex-col gap-y-3 px-4 py-2">
						<Label className="text-foreground-muted">{t(getFieldKey('jobOutput'))}</Label>
						<div className="rounded-xl bg-background-surface p-4">
							<pre className="text-xs text-foreground-muted">
								{JSON.stringify(associatedJob.outputData, null, 2)}
							</pre>
						</div>
					</div>
				)}

				{!!associatedJob?.logs?.length && (
					<div className="flex flex-col gap-y-3 px-4 py-2">
						<Label className="text-foreground-muted">{t(getFieldKey('logs'))}</Label>

						<Alert level="warning" className="p-2">
							<Alert.Content className="text-sm text-foreground-subtle">
								{t(getKey('logsPresent'))} ({associatedJob.logs.length})
							</Alert.Content>
						</Alert>

						<div>
							<ButtonOrLink
								href={`/settings/server/logs?job_id=${associatedJob.id}`}
								variant="secondary"
							>
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
