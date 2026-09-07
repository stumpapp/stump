import { useGraphQL } from '@stump/client'
import { Card, Preformatted, Sheet, Text, usePrevious } from '@stump/components'
import { FragmentType, graphql, JobTableQuery, useFragment } from '@stump/graphql'
import { useLocaleContext } from '@stump/i18n'
import { Api } from '@stump/sdk'
import { QueryClient } from '@tanstack/react-query'

import { Table } from '@/components/table'

import { columns } from '../logs/persisted-logs/PersistedLogsTable'

const fragment = graphql(`
	fragment JobDataInspector on CoreJobOutput {
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
		... on SeriesScanOutput {
			totalFiles
			ignoredFiles
			skippedFiles
			createdMedia
			updatedMedia
		}
		... on ThumbnailGenerationOutput {
			visitedFiles
			skippedFiles
			generatedThumbnails
			removedThumbnails
		}
	}
`)

export type JobDataInspectorFragment = FragmentType<typeof fragment>

type Job = JobTableQuery['jobs']['nodes'][number]

const logsQuery = graphql(`
	query JobDataInspectorLogs($id: String!) {
		logs(filter: { jobId: { eq: $id } }, pagination: { none: { unpaginated: true } }) {
			nodes {
				id
				level
				message
				timestamp
			}
		}
	}
`)

export function prefetchJobLogs(sdk: Api, client: QueryClient, jobId: string) {
	return client.prefetchQuery({
		queryKey: ['logsForJob', jobId],
		queryFn: async () => sdk.execute(logsQuery, { id: jobId }),
	})
}

type Props = {
	job?: Job | null
	onClose: () => void
}

// TODO: pull in logs from this job, bumps complexity a bit but worth i think (even tho there is a see logs btn)

export default function JobDataInspector({ job, onClose }: Props) {
	const { t } = useLocaleContext()

	const inlineData = useFragment(fragment, job?.outputData)
	const fallback = usePrevious(inlineData)
	const displayedData = inlineData || fallback

	const { data } = useGraphQL(
		logsQuery,
		['logsForJob', job?.id],
		{
			id: job?.id ?? '',
		},
		{
			enabled: !!job?.id && job.logCount > 0,
		},
	)
	const jobLogs = data?.logs.nodes ?? []

	return (
		<Sheet
			open={!!job}
			onClose={onClose}
			title={t(getKey('title'))}
			description={t(getKey('description'))}
		>
			<div className="px-4 gap-y-8 flex flex-col">
				<Preformatted content={displayedData} />

				{jobLogs.length > 0 && (
					<div className="gap-y-4 flex flex-col">
						<Text className="font-semibold">{t(getKey('associatedLogs'))}</Text>
						<Card className="overflow-hidden">
							<Table
								sortable
								columns={columns.slice(0, -1)} //  we don't need job id
								data={jobLogs}
								fullWidth
								isZeroBasedPagination
								cellClassName="bg-background"
								options={{}}
							/>
						</Card>
					</div>
				)}
			</div>
		</Sheet>
	)
}

const getKey = (key: string) => `settingsScene.server/jobs.sections.history.inspector.${key}`
