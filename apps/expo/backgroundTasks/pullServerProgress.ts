import * as Sentry from '@sentry/react-native'
import { graphql } from '@stump/graphql'
import { Api } from '@stump/sdk'
import { eq, inArray } from 'drizzle-orm'

import { db, downloadedFiles, epubProgress, readProgress, syncStatus } from '~/db'

const query = graphql(`
	query PullServerReadProgression($filter: MediaFilterInput!) {
		media(filter: $filter, pagination: { none: { unpaginated: true } }) {
			nodes {
				id
				readProgress {
					page
					percentageCompleted
					epubcfi
					updatedAt
					elapsedSeconds
					locator {
						chapterTitle
						href
						title
						type
						locations {
							fragments
							progression
							position
							totalProgression
							cssSelector
							partialCfi
						}
					}
				}
				readHistory {
					completedAt
				}
			}
		}
	}
`)

export type PullSyncResult = {
	failedBookIds: string[]
}

/**
 * Pull the server progress for downloaded books for a single server
 *
 * @param serverId The ID of the server to attempt syncing progression to
 * @param api The *authenticated* instance for interacting with that server
 */
export const executeSingleServerPullSync = async (
	serverId: string,
	api: Api,
): Promise<PullSyncResult> => {
	const downloadedBooks = await db
		.select({ id: downloadedFiles.id })
		.from(downloadedFiles)
		.where(eq(downloadedFiles.serverId, serverId))
		.all()

	if (downloadedBooks.length === 0) {
		return { failedBookIds: [] }
	}

	const downloadedBookIds = downloadedBooks.map((b) => b.id)

	const {
		media: { nodes: serverMedia },
	} = await api.execute(query, {
		filter: { id: { anyOf: downloadedBookIds } },
	})

	if (serverMedia.length === 0) {
		return { failedBookIds: [] }
	}

	const localRecords = await db
		.select()
		.from(readProgress)
		.where(
			inArray(
				readProgress.bookId,
				serverMedia.map((m) => m.id),
			),
		)
		.all()

	const localProgressMap = new Map(localRecords.map((r) => [r.bookId, r]))
	const failedBookIds: string[] = []

	for (const media of serverMedia) {
		const localProgress = localProgressMap.get(media.id)
		const localUpdatedAt = localProgress?.lastModified ?? new Date(0) // epoch, i.e. basically always older

		const sortedReadHistory = (media.readHistory ?? []).sort((a, b) => {
			const dateA = a.completedAt ? new Date(a.completedAt).getTime() : 0
			const dateB = b.completedAt ? new Date(b.completedAt).getTime() : 0
			return dateB - dateA // Descending order
		})
		const serverCompletedAt = sortedReadHistory.at(0)?.completedAt

		if (serverCompletedAt && serverCompletedAt > localUpdatedAt) {
			try {
				await db.delete(readProgress).where(eq(readProgress.bookId, media.id)).run()
			} catch (error) {
				// Note: A failure to delete local progress is not a failure to pull progress,
				// so we log it but don't add to failedBookIds
				console.error('Failed to delete local progress for completed book', {
					bookId: media.id,
					error,
				})
				Sentry.captureException(error, { extra: { bookId: media.id } })
			}
			continue
		}

		// No progress = skip (nothing to pull)
		const progress = media.readProgress
		if (!progress) continue

		const serverUpdatedAt = progress.updatedAt ? new Date(progress.updatedAt) : new Date(0)

		// Local already ahead = skip (need to push)
		if (localUpdatedAt >= serverUpdatedAt) continue

		try {
			const isEpub = !!progress.locator
			const percentage = progress.percentageCompleted
				? String(parseFloat(progress.percentageCompleted))
				: null

			const values: typeof readProgress.$inferInsert = {
				bookId: media.id,
				serverId,
				page: progress.page,
				elapsedSeconds: progress.elapsedSeconds,
				percentage,
				epubProgress: isEpub
					? epubProgress.safeParse({
							chapterTitle: progress.locator?.chapterTitle || '',
							href: progress.locator?.href || '',
							locations: progress.locator?.locations || {},
						}).data
					: null,
				syncStatus: syncStatus.enum.SYNCED,
				lastModified: serverUpdatedAt,
			}

			await db
				.insert(readProgress)
				.values(values)
				.onConflictDoUpdate({
					target: readProgress.bookId,
					set: values,
				})
				.run()
		} catch (error) {
			// Fail to pull means we can't reliably push later, so mark as failed
			console.error('Failed to pull server progress for book', {
				bookId: media.id,
				error,
			})
			Sentry.captureException(error, {
				extra: { bookId: media.id, progress },
			})
			failedBookIds.push(media.id)
		}
	}

	return { failedBookIds }
}

/**
 * Pull the remote progress for downloaded books for multiple servers all at once.
 * This should be run before pushing local progress to avoid overwriting newer
 * remote progress
 *
 * @param instances A map of serverId-to-SDK instance
 */
export const executePullProgressSync = async (
	instances: Record<string, Api>,
): Promise<Record<string, PullSyncResult>> => {
	const results = Object.entries(instances).map(async ([serverId, api]) => {
		const result = await executeSingleServerPullSync(serverId, api)
		return [serverId, result] as const
	})

	return Object.fromEntries(await Promise.all(results))
}
