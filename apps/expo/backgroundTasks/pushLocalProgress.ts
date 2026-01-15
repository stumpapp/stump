import { graphql, MediaProgressInput } from '@stump/graphql'
import { Api } from '@stump/sdk'
import { and, eq, inArray, not } from 'drizzle-orm'
import { match } from 'ts-pattern'

import { db, epubProgress, readProgress, syncStatus } from '~/db'

const mutation = graphql(`
	mutation PushLocalReadProgression($id: ID!, $input: MediaProgressInput!) {
		updateMediaProgress(id: $id, input: $input) {
			__typename
		}
	}
`)

type SyncResult = {
	failureCount: number
	syncedCount: number
}

/**
 *	Push the local progress up for a single server
 *
 * @param serverId The ID of the server to attempt syncing progression to
 * @param api The *authenticated* instance for interacting with that server
 * @param ignoreBookIds Optional list of book IDs to skip syncing (e.g., books that failed to pull)
 */
const executeSingleServerSync = async (
	serverId: string,
	api: Api,
	ignoreBookIds?: string[],
): Promise<SyncResult> => {
	const allProgressRecords = await db
		.select()
		.from(readProgress)
		.where(
			and(
				eq(readProgress.serverId, serverId),
				not(inArray(readProgress.syncStatus, [syncStatus.Enum.SYNCED, syncStatus.Enum.SYNCING])),
			),
		)
		.all()

	const progressRecords = ignoreBookIds?.length
		? allProgressRecords.filter((r) => !ignoreBookIds.includes(r.bookId))
		: allProgressRecords

	if (progressRecords.length === 0) {
		return {
			failureCount: 0,
			syncedCount: 0,
		}
	}

	await db
		.update(readProgress)
		.set({ syncStatus: syncStatus.Enum.SYNCING })
		.where(
			and(
				eq(readProgress.serverId, serverId),
				inArray(
					readProgress.id,
					progressRecords.map((record) => record.id),
				),
			),
		)
		.run()

	let failureCount = 0

	// Note: I didn't do a transaction here because each iteration involves an external API call
	for (const record of progressRecords) {
		try {
			const payload: MediaProgressInput = match(epubProgress.safeParse(record.epubProgress).data)
				.when(
					(data) => data != undefined,
					(data) =>
						({
							epub: {
								locator: {
									readium: data,
								},
								elapsedSeconds: record.elapsedSeconds,
								isComplete: record.percentage ? parseFloat(record.percentage) >= 0.99 : false,
								percentage: record.percentage,
							},
						}) satisfies MediaProgressInput,
				)
				.otherwise(
					() =>
						({
							paged: {
								page: record.page ?? 1,
								elapsedSeconds: record.elapsedSeconds,
							},
						}) satisfies MediaProgressInput,
				)

			await api.execute(mutation, {
				id: record.bookId,
				input: payload,
			})

			await db
				.update(readProgress)
				.set({ syncStatus: syncStatus.Enum.SYNCED })
				.where(eq(readProgress.id, record.id))
				.run()
		} catch {
			failureCount++
			await db
				.update(readProgress)
				.set({ syncStatus: syncStatus.Enum.ERROR })
				.where(eq(readProgress.id, record.id))
				.run()
		}
	}

	return {
		failureCount,
		syncedCount: progressRecords.length - failureCount,
	}
}

/**
 *	Push the local progress up for multiple servers all at once. This assumes
 *	that you have pulled progress first and resolved any conflicts locally.
 *
 * @param instances A map of serverId-to-SDK instace
 * @param ignoreBookIds Optional list of book IDs to skip syncing
 */
export const executePushProgressSync = async (
	instances: Record<string, Api>,
	ignoreBookIds?: string[],
): Promise<Record<string, SyncResult>> => {
	const results = Object.entries(instances).map(async ([serverId, api]) => {
		const result = await executeSingleServerSync(serverId, api, ignoreBookIds)
		return [serverId, result] as const
	})

	return Object.fromEntries(await Promise.all(results))
}
