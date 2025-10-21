import { MediaMetadata } from '@stump/graphql'
import { and, eq } from 'drizzle-orm'

import { db } from './client'
import {
	type DownloadedFile,
	downloadedFiles,
	libraryRefs,
	type NewDownloadedFile,
	seriesRefs,
} from './schema'

/**
 * Parameters for adding a downloaded file
 */
export type AddDownloadedFileParams = {
	id: string
	filename: string
	uri: string
	serverId: string
	size?: number | null
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
				bookName: file.metadata?.title,
				bookDescription: file.metadata?.summary,
				bookMetadata: file.metadata as Record<string, unknown>,
				seriesId: file.seriesId,
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
