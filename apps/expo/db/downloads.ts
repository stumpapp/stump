import * as Sentry from '@sentry/react-native'
import { MediaMetadata } from '@stump/graphql'
import { and, eq } from 'drizzle-orm'

import { thumbnailsDirectory } from '~/lib/filesystem'

import StumpStreamer from '../modules/streamer'
import { db } from './client'
import {
	type DownloadedFile,
	downloadedFiles,
	libraryRefs,
	type NewDownloadedFile,
	seriesRefs,
} from './schema'

// TODO: Support RAR?

/**
 * Calculate page count for a downloaded file
 */
async function calculatePageCount(uri: string, filename: string): Promise<number> {
	try {
		const extension = filename.split('.').pop()?.toLowerCase()
		if (!extension || !['cbz', 'zip'].includes(extension)) {
			return -1 // Not a comic book archive
		}

		return await StumpStreamer.getPageCount(uri)
	} catch (error) {
		console.warn('Failed to calculate page count:', error)
		return -1
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
}

/**
 * Optional metadata references when adding a downloaded file
 */
export type AddDownloadedFileOptions = {
	seriesRef?: { id: string; name: string; libraryId?: string | null }
	libraryRef?: { id: string; name: string }
}

/**
 * Repository for managing downloaded files in SQLite
 */
export class DownloadRepository {
	/**
	 * Add a downloaded file to the database
	 */
	static async addFile(
		file: AddDownloadedFileParams,
		options?: AddDownloadedFileOptions,
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
			// Insert or update series reference if provided
			if (options?.seriesRef) {
				await tx
					.insert(seriesRefs)
					.values({
						id: options.seriesRef.id,
						serverId: file.serverId,
						name: options.seriesRef.name,
						libraryId: options.seriesRef.libraryId,
					})
					.onConflictDoUpdate({
						target: seriesRefs.id,
						set: {
							name: options.seriesRef.name,
							libraryId: options.seriesRef.libraryId,
						},
					})
			}

			if (options?.libraryRef) {
				await tx
					.insert(libraryRefs)
					.values({
						id: options.libraryRef.id,
						serverId: file.serverId,
						name: options.libraryRef.name,
					})
					.onConflictDoUpdate({
						target: libraryRefs.id,
						set: {
							name: options.libraryRef.name,
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
			}

			const result = await tx.insert(downloadedFiles).values(newFile).returning()
			return result[0]
		})
	}

	/**
	 * Get all downloaded files for a specific server
	 */
	static async getFilesByServer(serverId: string): Promise<DownloadedFile[]> {
		return db.select().from(downloadedFiles).where(eq(downloadedFiles.serverId, serverId)).all()
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
