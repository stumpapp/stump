import { graphql, MediaProgressInput } from '@stump/graphql'
import { Api } from '@stump/sdk'
import { and, eq, inArray, not } from 'drizzle-orm'
import { match } from 'ts-pattern'

import { db, epubProgress, readProgress, syncStatus } from '~/db'

const mutation = graphql(`
	mutation UpdateReadProgressionBackgroundTask($id: ID!, $input: MediaProgressInput!) {
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
 *
 * @param serverId The ID of the server to attempt syncing progression to
 * @param api The *authenticated* instance for interacting with that server
 */
export const executeSingleServerSync = async (serverId: string, api: Api): Promise<SyncResult> => {
	const progressRecords = await db
		.select()
		.from(readProgress)
		.where(
			and(
				eq(readProgress.serverId, serverId),
				not(inArray(readProgress.syncStatus, [syncStatus.Enum.SYNCED, syncStatus.Enum.SYNCING])),
			),
		)
		.all()

	if (progressRecords.length === 0) {
		return {
			failureCount: 0,
			syncedCount: 0,
		}
	}

	// Update each status to SYNCING
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

	const failureCount = 0

	// Note: I didn't do a transaction here because I wasn't sure if I should when
	// each iteration involves an external API call.
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
								isComplete: record.percentage ? parseFloat(record.percentage) >= 100 : false,
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
			// Need to set the status to ERROR when failed
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
 *	Execute progress sync for multiple servers all at once
 *
 * @param instances A map of serverId-to-SDK instace
 */
export const executeProgressSync = async (
	instances: Record<string, Api>,
): Promise<Record<string, SyncResult>> => {
	const results = Object.entries(instances).map(async ([serverId, api]) => {
		const result = await executeSingleServerSync(serverId, api)
		return [serverId, result] as const
	})

	return Object.fromEntries(await Promise.all(results))
}
