import { useGraphQL } from '@stump/client'
import { ButtonOrLink, cn, Label, NewCard, Preformatted, Sheet } from '@stump/components'
import { graphql, UserPermission } from '@stump/graphql'
import { intlFormat } from 'date-fns'
import { useMemo } from 'react'

import { useAppContext } from '@/context'
import { useCurrentOrPrevious } from '@/hooks/useCurrentOrPrevious'
import { usePreferences } from '@/hooks/usePreferences'
import { useTranslate } from '@/hooks/useTranslate'

import { useLibraryManagement } from '../../../context'
import { LibraryScanRecord } from './ScanHistoryTable'

// TODO(chore): realizing this is effectively a narrower-version of
// the job inspector. not going to inflate the diff even more here outside
// small ui fixes (the locale shifts are already so heavy) but should just
// refactor to use that instead of this scan-specific one

const query = graphql(`
	query ScanRecordInspectorJobs($id: ID!, $loadLogs: Boolean!) {
		jobById(id: $id) {
			id
			outputData {
				__typename
				... on LibraryScanOutput {
					totalFiles
					totalDirectories
					ignoredFiles
					skippedFiles
					ignoredDirectories
					createdMedia
					updatedMedia
					createdSeries
					updatedSeries
				}
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
	const { t } = useTranslate()
	const { checkPermission } = useAppContext()
	const {
		preferences: { enableHideScrollbar },
	} = usePreferences()
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

	const scannedAtFormatted = displayedData?.timestamp
		? intlFormat(new Date(displayedData.timestamp), {
				month: 'long',
				day: 'numeric',
				year: 'numeric',
				hour: 'numeric',
				minute: '2-digit',
			})
		: ''

	return (
		<Sheet
			open={!!record}
			onClose={onClose}
			title={t(getKey('title'))}
			description={t(getKey('description'))}
		>
			<div
				className={cn('flex flex-col overflow-y-auto', {
					'scrollbar-hide': enableHideScrollbar,
				})}
			>
				<div className="px-4 py-2" data-testid="lib-meta">
					<NewCard>
						<NewCard.Row
							label={t(getFieldKey('library'))}
							value={
								record ? name : <div className="h-6 w-32 animate-pulse rounded-md bg-accent" />
							}
						/>
						<NewCard.Row label={t(getFieldKey('date'))} value={scannedAtFormatted} />
					</NewCard>
				</div>

				{displayedData?.options?.config && (
					<div className="gap-y-3 px-4 py-2 flex flex-col">
						<Label className="text-muted-foreground">{t(getFieldKey('config'))}</Label>
						<div className="p-4 rounded-xl bg-muted">
							<pre className="text-xs text-muted-foreground">
								{JSON.stringify(displayedData.options.config, null, 2)}
							</pre>
						</div>
					</div>
				)}

				{/*TODO: one day it would be fun to have a prettier ui for each type of output*/}
				{associatedJob?.outputData && (
					<div className="px-4 py-2">
						<Preformatted title={t(getFieldKey('jobOutput'))} content={associatedJob.outputData} />
					</div>
				)}

				{!!associatedJob?.logs?.length && (
					<div className="gap-y-3 px-4 py-2">
						<NewCard label={t(getFieldKey('logs'))}>
							<NewCard.Row label={t(getKey('logsPresent'))}>
								<div>
									<ButtonOrLink
										href={`/settings/server/logs?jobId=${associatedJob.id}`}
										variant="secondary"
									>
										{t(getKey('seeLogs'))}
									</ButtonOrLink>
								</div>
							</NewCard.Row>
						</NewCard>
					</div>
				)}
			</div>
		</Sheet>
	)
}

const LOCALE_BASE = 'librarySettingsScene.options/scanning.sections.history.inspector'
const getFieldKey = (key: string) => `${LOCALE_BASE}.fields.${key}`
const getKey = (key: string) => `${LOCALE_BASE}.${key}`
