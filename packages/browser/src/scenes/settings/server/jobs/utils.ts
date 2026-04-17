import { MetadataFetchStatus } from '@stump/graphql'
import z from 'zod'

const scheduledScanConfig = z.object({
	libraryIds: z.array(z.string()),
})

const scheduledMetadataRetryConfig = z.object({
	statuses: z.array(z.nativeEnum(MetadataFetchStatus)),
})

const scheduledJobConfig = z.union([scheduledScanConfig, scheduledMetadataRetryConfig])

export const parseScheduledJobConfig = (config: unknown) => {
	const result = scheduledJobConfig.safeParse(config)
	if (result.success) {
		return result.data
	}
	console.error('Failed to parse scheduled job config', result.error)
	return null
}

export type LibraryOption = { id: string; name: string; emoji?: string | null }

export const CRON_PRESETS = [
	{ localeKey: 'everySixHours', value: '0 0 */6 * * *' },
	{ localeKey: 'everyTwelveHours', value: '0 0 */12 * * *' },
	{ localeKey: 'dailyAtMidnight', value: '0 0 0 * * *' },
	{ localeKey: 'weeklySunday', value: '0 0 0 * * 0' },
	{ localeKey: 'monthlyFirst', value: '0 0 0 1 * *' },
] as const

export const RETRYABLE_STATUSES = [
	{ localeKey: 'rateLimited', value: MetadataFetchStatus.RateLimited },
	{ localeKey: 'failed', value: MetadataFetchStatus.Failed },
] as const

export const KIND_OPTIONS = [
	{ localeKey: 'libraryScan', value: 'LIBRARY_SCAN' },
	{ localeKey: 'metadataRetry', value: 'METADATA_RETRY' },
] as const

export const scheduledJobFormSchema = z.object({
	name: z.string().min(1),
	schedule: z.string().min(1),
	kind: z.enum(['LIBRARY_SCAN', 'METADATA_RETRY']),
	libraryIds: z.array(z.string()).default([]),
	statuses: z
		.array(z.nativeEnum(MetadataFetchStatus))
		.min(1)
		.default([MetadataFetchStatus.RateLimited]),
	enabled: z.boolean().default(true),
})
export type ScheduledJobFormValues = z.infer<typeof scheduledJobFormSchema>

export function buildScheduledJobInput(values: ScheduledJobFormValues) {
	const config =
		values.kind === 'LIBRARY_SCAN'
			? { libraryScan: { libraryIds: values.libraryIds } }
			: { metadataRetry: { statuses: values.statuses } }
	return { name: values.name, schedule: values.schedule, config, enabled: values.enabled }
}
