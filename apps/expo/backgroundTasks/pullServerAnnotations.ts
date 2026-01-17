import * as Sentry from '@sentry/react-native'
import { graphql, PullServerAnnotationsQuery } from '@stump/graphql'
import { Api } from '@stump/sdk'
import { and, eq, inArray, isNull } from 'drizzle-orm'
import isEqual from 'lodash/isEqual'

import { annotationLocator, annotations, db, downloadedFiles, syncStatus } from '~/db'
import { ReadiumLocator } from '~/modules/readium'

const query = graphql(`
	query PullServerAnnotations($id: ID!) {
		annotationsByMediaId(id: $id) {
			id
			annotationText
			createdAt
			updatedAt
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
				text {
					after
					before
					highlight
				}
			}
		}
	}
`)

type ServerAnnotation = PullServerAnnotationsQuery['annotationsByMediaId'][number]

export type PullAnnotationsSyncResult = {
	failedBookIds: string[]
}

const findMatchingLocator = (
	remoteLocator: ReadiumLocator,
	local: (typeof annotations.$inferSelect)[],
): typeof annotations.$inferSelect | null => {
	const isLocatorEqual = (parsedLocator?: typeof annotationLocator._type) =>
		parsedLocator ? isEqual(remoteLocator, parsedLocator) : false

	const found = local.find(
		(l) =>
			!l.serverAnnotationId &&
			l.syncStatus === syncStatus.enum.UNSYNCED &&
			isLocatorEqual(annotationLocator.safeParse(l.locator).data),
	)

	return found || null
}

const handleServerIdMatch = async (
	localMatch: typeof annotations.$inferSelect,
	serverAnnotation: ServerAnnotation,
) => {
	const serverUpdatedAt = new Date(serverAnnotation.updatedAt)
	if (serverUpdatedAt > localMatch.updatedAt) {
		await db
			.update(annotations)
			.set({
				locator: serverAnnotation.locator,
				annotationText: serverAnnotation.annotationText,
				updatedAt: serverUpdatedAt,
				syncStatus: syncStatus.enum.SYNCED,
			})
			.where(eq(annotations.id, localMatch.id))
			.run()
	}
}

const handleLocatorMatch = async (
	localMatch: typeof annotations.$inferSelect,
	serverAnnotation: ServerAnnotation,
) => {
	const serverUpdatedAt = new Date(serverAnnotation.updatedAt)
	await db
		.update(annotations)
		.set({
			serverAnnotationId: serverAnnotation.id,
			locator: serverAnnotation.locator,
			annotationText:
				serverUpdatedAt > localMatch.updatedAt
					? serverAnnotation.annotationText
					: localMatch.annotationText,
			updatedAt: serverUpdatedAt > localMatch.updatedAt ? serverUpdatedAt : localMatch.updatedAt,
			syncStatus: syncStatus.enum.SYNCED,
		})
		.where(eq(annotations.id, localMatch.id))
		.run()
}

const handleInsertServerAnnotation = async (
	bookId: string,
	serverId: string,
	serverAnnotation: ServerAnnotation,
) => {
	await db
		.insert(annotations)
		.values({
			bookId,
			serverId,
			locator: serverAnnotation.locator,
			annotationText: serverAnnotation.annotationText,
			createdAt: new Date(serverAnnotation.createdAt),
			updatedAt: new Date(serverAnnotation.updatedAt),
			syncStatus: syncStatus.enum.SYNCED,
			serverAnnotationId: serverAnnotation.id,
		})
		.run()
}

export const executeSingleServerAnnotationPullSync = async (
	serverId: string,
	api: Api,
): Promise<PullAnnotationsSyncResult> => {
	const downloadedBooks = await db
		.select({ id: downloadedFiles.id })
		.from(downloadedFiles)
		.where(eq(downloadedFiles.serverId, serverId))
		.all()

	if (downloadedBooks.length === 0) {
		return { failedBookIds: [] }
	}

	const failedBookIds: string[] = []

	for (const book of downloadedBooks) {
		try {
			const serverAnnotations = await api.execute(query, { id: book.id })

			const localAnnotations = await db
				.select()
				.from(annotations)
				.where(and(eq(annotations.bookId, book.id), isNull(annotations.deletedAt)))
				.all()

			const localByServerId = new Map(
				localAnnotations.filter((a) => a.serverAnnotationId).map((a) => [a.serverAnnotationId!, a]),
			)

			const serverIds = new Set(serverAnnotations.annotationsByMediaId.map((a) => a.id))

			for (const serverAnnotation of serverAnnotations.annotationsByMediaId) {
				const localMatch = localByServerId.get(serverAnnotation.id)

				if (localMatch) {
					await handleServerIdMatch(localMatch, serverAnnotation)
				} else {
					const locatorMatch = findMatchingLocator(serverAnnotation.locator, localAnnotations)
					if (locatorMatch) {
						await handleLocatorMatch(locatorMatch, serverAnnotation)
					} else {
						await handleInsertServerAnnotation(book.id, serverId, serverAnnotation)
					}
				}
			}

			const toDelete = localAnnotations.filter(
				(local) =>
					local.serverAnnotationId &&
					!serverIds.has(local.serverAnnotationId) &&
					local.syncStatus === syncStatus.enum.SYNCED,
			)

			if (toDelete.length > 0) {
				await db
					.delete(annotations)
					.where(
						inArray(
							annotations.id,
							toDelete.map((a) => a.id),
						),
					)
					.run()
			}
		} catch (error) {
			console.error('Failed to pull annotations for book', { bookId: book.id, error })
			Sentry.captureException(error, { extra: { bookId: book.id } })
			failedBookIds.push(book.id)
		}
	}

	return { failedBookIds }
}

/**
 * Pull annotations from multiple servers at once
 *
 * @param instances A map of serverId-to-SDK instance
 */
export const executePullAnnotationsSync = async (
	instances: Record<string, Api>,
): Promise<Record<string, PullAnnotationsSyncResult>> => {
	const results = await Promise.all(
		Object.entries(instances).map(async ([serverId, api]) => {
			const result = await executeSingleServerAnnotationPullSync(serverId, api)
			return [serverId, result] as const
		}),
	)

	return Object.fromEntries(results)
}
