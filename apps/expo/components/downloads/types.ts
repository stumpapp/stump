import { downloadedFiles, libraryRefs, seriesRefs, unsyncedReadProgress } from '~/db'

export type DownloadedFile = typeof downloadedFiles.$inferSelect & {
	series?: typeof seriesRefs.$inferSelect | null
	library?: typeof libraryRefs.$inferSelect | null
	unsyncedProgress?: typeof unsyncedReadProgress.$inferSelect | null
}

type JoinedRecord = {
	downloaded_files: typeof downloadedFiles.$inferSelect
	series_refs: typeof seriesRefs.$inferSelect | null
	library_refs: typeof libraryRefs.$inferSelect | null
	unsynced_read_progress: typeof unsyncedReadProgress.$inferSelect | null
}

export const intoDownloadedFile = (record: JoinedRecord): DownloadedFile => ({
	...record.downloaded_files,
	series: record.series_refs,
	library: record.library_refs,
	unsyncedProgress: record.unsynced_read_progress,
})
