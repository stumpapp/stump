import * as Sentry from '@sentry/react-native'
import { MediaMetadata, ReadiumLocator } from '@stump/graphql'
import { and, count, eq } from 'drizzle-orm'

import { thumbnailsDirectory } from '~/lib/filesystem'

import StumpStreamer from '../modules/streamer'
import { db } from './client'
import {
	type DownloadedFile,
	downloadedFiles,
	epubProgress,
	libraryRefs,
	type NewDownloadedFile,
	readProgress,
	seriesRefs,
	syncStatus,
} from './schema'

// TODO: Support RAR?

/**
 * Calculate page count for a downloaded file
 */
async function calculatePageCount(uri: string, filename: string): Promise<number> {
	try {
		const extension = filename.split('.').pop()?.toLowerCase()
		if (!extension || !['cbz', 'zip', 'pdf'].includes(extension)) {
			return 0 // Not a paged format we can handle
		}
		return await StumpStreamer.getPageCount(uri)
	} catch (error) {
		console.warn('Failed to calculate page count:', error)
		return 0
	}
}

/**
 * Parameters for adding a downloaded file
 */
export type AddDownloadedFileParams = {
	id: string
	filename: string
	uri: string
	serverId: string
	size?: number | null
	bookName?: string | null
	metadata?: Partial<MediaMetadata> | null
	seriesId?: string | null
	toc?: string[] | null
}

/**
 * Optional metadata references when adding a downloaded file
 */
export type AddDownloadRelations = {
	seriesRef?: { id: string; name: string; libraryId?: string | null }
	libraryRef?: { id: string; name: string }
	existingProgression?: {
		percentageCompleted?: string | null
		page?: number | null
		elapsedSeconds?: number | null
		locator?: ReadiumLocator | null
		updatedAt?: Date | null
	} | null
}

// TODO: Consider organizing repos into subdirs if I add any additional ones
// E.g., repositories/{downloads, etc}

/**
 * Repository for managing downloaded files in SQLite
 */
export class DownloadRepository {
	/**
	 * Add a downloaded file to the database
	 */
	static async addFile(
		file: AddDownloadedFileParams,
		relations?: AddDownloadRelations,
	): Promise<DownloadedFile> {
		const pages = await calculatePageCount(file.uri, file.filename)

		// TODO: Should this be a background task? Or just don't await the promise?
		try {
			await StumpStreamer.generateThumbnail(file.id, file.uri, thumbnailsDirectory(file.serverId))
		} catch (error) {
			Sentry.withScope((scope) => {
				scope.setTag('action', 'generate thumbnail for downloaded file')
				scope.setExtra('bookID', file.id)
				scope.setExtra('fileUri', file.uri)
				Sentry.captureException(error)
			})
			console.error('Error generating thumbnail for downloaded file:', error)
		}

		return db.transaction(async (tx) => {
			if (relations?.seriesRef) {
				await tx
					.insert(seriesRefs)
					.values({
						id: relations.seriesRef.id,
						serverId: file.serverId,
						name: relations.seriesRef.name,
						libraryId: relations.seriesRef.libraryId,
					})
					.onConflictDoUpdate({
						target: seriesRefs.id,
						set: {
							name: relations.seriesRef.name,
							libraryId: relations.seriesRef.libraryId,
						},
					})
			}

			if (relations?.libraryRef) {
				await tx
					.insert(libraryRefs)
					.values({
						id: relations.libraryRef.id,
						serverId: file.serverId,
						name: relations.libraryRef.name,
					})
					.onConflictDoUpdate({
						target: libraryRefs.id,
						set: {
							name: relations.libraryRef.name,
						},
					})
			}

			if (relations?.existingProgression) {
				const values = {
					bookId: file.id,
					serverId: file.serverId,
					page: relations.existingProgression.page ?? undefined,
					percentage: relations.existingProgression.percentageCompleted ?? undefined,
					elapsedSeconds: relations.existingProgression.elapsedSeconds ?? undefined,
					epubProgress: relations.existingProgression.locator
						? epubProgress.safeParse(relations.existingProgression.locator).data
						: undefined,
					syncStatus: syncStatus.enum.SYNCED,
				} satisfies typeof readProgress.$inferInsert

				await tx
					.insert(readProgress)
					.values(values)
					.onConflictDoUpdate({
						target: readProgress.bookId,
						set: {
							...values,
							lastModified: new Date(relations.existingProgression.updatedAt ?? new Date()),
						},
					})
			}

			const newFile: NewDownloadedFile = {
				id: file.id,
				filename: file.filename,
				uri: file.uri,
				serverId: file.serverId,
				size: file.size,
				bookName: file.bookName ?? file.metadata?.title,
				bookDescription: file.metadata?.summary,
				bookMetadata: file.metadata as Record<string, unknown>,
				seriesId: file.seriesId,
				pages,
				toc: file.toc,
			}

			const result = await tx
				.insert(downloadedFiles)
				.values(newFile)
				.onConflictDoUpdate({
					target: downloadedFiles.id,
					set: {
						filename: newFile.filename,
						uri: newFile.uri,
						size: newFile.size,
						bookName: newFile.bookName,
						bookDescription: newFile.bookDescription,
						bookMetadata: newFile.bookMetadata,
						seriesId: newFile.seriesId,
						pages: newFile.pages,
					},
				})
				.returning()
			return result[0]
		})
	}

	/**
	 * Get all downloaded files for a specific server
	 */
	static async getFilesByServer(serverId: string): Promise<DownloadedFile[]> {
		return db.select().from(downloadedFiles).where(eq(downloadedFiles.serverId, serverId)).all()
	}

	static async getCount(): Promise<number> {
		const result = await db.select({ count: count() }).from(downloadedFiles)
		return result[0]?.count || 0
	}

	/**
	 * Get a specific downloaded file
	 */
	static async getFile(bookID: string, serverId: string): Promise<DownloadedFile | undefined> {
		const results = await db
			.select()
			.from(downloadedFiles)
			.where(and(eq(downloadedFiles.id, bookID), eq(downloadedFiles.serverId, serverId)))
			.all()
		return results[0]
	}

	/**
	 * Delete a downloaded file from the database
	 */
	static async deleteFile(bookID: string, serverId: string): Promise<void> {
		await db
			.delete(downloadedFiles)
			.where(and(eq(downloadedFiles.id, bookID), eq(downloadedFiles.serverId, serverId)))
	}
}
