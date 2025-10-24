import { downloadedFiles, libraryRefs, readProgress, seriesRefs } from '~/db'

export type DownloadedFile = typeof downloadedFiles.$inferSelect & {
	series?: typeof seriesRefs.$inferSelect | null
	library?: typeof libraryRefs.$inferSelect | null
	readProgress?: typeof readProgress.$inferSelect | null
}

type JoinedRecord = {
	downloaded_files: typeof downloadedFiles.$inferSelect
	series_refs: typeof seriesRefs.$inferSelect | null
	library_refs: typeof libraryRefs.$inferSelect | null
	read_progress: typeof readProgress.$inferSelect | null
}

export const intoDownloadedFile = (record: JoinedRecord): DownloadedFile => ({
	...record.downloaded_files,
	series: record.series_refs,
	library: record.library_refs,
	readProgress: record.read_progress,
})
