import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'
import { z } from 'zod'

/**
 * Downloaded files (books) table
 * Stores information about books that have been downloaded for offline reading
 */
export const downloadedFiles = sqliteTable('downloaded_files', {
	id: text('id').primaryKey(), // Book ID from Stump server
	filename: text('filename').notNull(), // Local filename (e.g., bookID.epub)
	uri: text('uri').notNull(), // Local file URI
	serverId: text('server_id').notNull(), // Server the book was downloaded from
	size: integer('size'), // File size in bytes
	downloadedAt: integer('downloaded_at', { mode: 'timestamp' })
		.notNull()
		.$defaultFn(() => new Date()),
	// Book metadata for offline display
	bookName: text('book_name'),
	bookDescription: text('book_description'),
	bookMetadata: text('book_metadata', { mode: 'json' }),
	seriesId: text('series_id'),
	pages: integer('pages').default(-1), // Number of pages (for comic books)
	// TODO: Store for PDF, too?
	toc: text('toc', { mode: 'json' }), // Table of contents for EPUB books
})

/**
 * Series references table
 * Stores minimal series information for offline display
 */
export const seriesRefs = sqliteTable('series_refs', {
	id: text('id').primaryKey(), // Series ID from Stump server
	serverId: text('server_id').notNull(), // Server the series belongs to
	name: text('name').notNull(),
	libraryId: text('library_id'), // Reference to library table
})

/**
 * Library references table
 * Stores minimal library information for offline display
 */
export const libraryRefs = sqliteTable('library_refs', {
	id: text('id').primaryKey(), // Library ID from Stump server
	serverId: text('server_id').notNull(), // Server the library belongs to
	name: text('name').notNull(),
})

export const syncStatus = z.enum(['UNSYNCED', 'SYNCING', 'SYNCED', 'ERROR'])

/**
 * Unsynced read progress table
 * Stores reading progress that hasn't been synced to the server yet
 */
export const readProgress = sqliteTable('read_progress', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	bookId: text('book_id')
		.unique()
		.notNull()
		.references(() => downloadedFiles.id, { onDelete: 'cascade' }),
	serverId: text('server_id').notNull(),
	page: integer('page'),
	epubProgress: text('epub_progress', { mode: 'json' }),
	elapsedSeconds: integer('elapsed_seconds'),
	// A number between 0 and 1 representing progress through the book
	percentage: text('percentage'),
	lastModified: integer('last_modified', { mode: 'timestamp' })
		.notNull()
		.$defaultFn(() => new Date()),
	syncStatus: text('sync_status').notNull().default(syncStatus.enum.UNSYNCED),
})

export type DownloadedFile = typeof downloadedFiles.$inferSelect
export type NewDownloadedFile = typeof downloadedFiles.$inferInsert

export type SeriesRef = typeof seriesRefs.$inferSelect
export type NewSeriesRef = typeof seriesRefs.$inferInsert

export type LibraryRef = typeof libraryRefs.$inferSelect
export type NewLibraryRef = typeof libraryRefs.$inferInsert

export type UnsyncedReadProgress = typeof readProgress.$inferSelect
export type NewUnsyncedReadProgress = typeof readProgress.$inferInsert

export const epubProgress = z.object({
	chapterTitle: z.string().default(''),
	href: z.string(),
	locations: z.object({
		fragments: z.array(z.string()).nullish(),
		position: z.number().nullish(),
		// Note: Stored as strings in the DB, so need to preprocess
		progression: z.preprocess((val) => {
			if (typeof val === 'string') return parseInt(val, 10)
			return val
		}, z.number().nullish()),
		// Note: Stored as strings in the DB, so need to preprocess
		totalProgression: z.preprocess((val) => {
			if (typeof val === 'string') return parseInt(val, 10)
			return val
		}, z.number().nullish()),
		cssSelector: z.string().nullish(),
		partialCfi: z.string().nullish(),
	}),
	title: z.string().nullish(),
	type: z.string().default('application/xhtml+xml'),
})

export const epubToc = z.array(z.string())
