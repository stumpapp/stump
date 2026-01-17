import * as Sentry from '@sentry/react-native'
import { graphql } from '@stump/graphql'
import { Api } from '@stump/sdk'
import { and, eq, inArray, isNotNull, isNull, not } from 'drizzle-orm'
import { z } from 'zod'

import { annotationLocator, annotations, db, syncStatus } from '~/db'

type Annotation = typeof annotations.$inferSelect
type SyncStatus = z.infer<typeof syncStatus>

const createMutation = graphql(`
	mutation PushCreateAnnotation($input: CreateAnnotationInput!) {
		createAnnotation(input: $input) {
			id
		}
	}
`)

const updateMutation = graphql(`
	mutation PushUpdateAnnotation($input: UpdateAnnotationInput!) {
		updateAnnotation(input: $input) {
			id
		}
	}
`)

const deleteMutation = graphql(`
	mutation PushDeleteAnnotation($id: String!) {
		deleteAnnotation(id: $id) {
			id
		}
	}
`)

const fetchUnsyncedAnnotations = async (serverId: string) =>
	db
		.select()
		.from(annotations)
		.where(
			and(
				eq(annotations.serverId, serverId),
				not(inArray(annotations.syncStatus, [syncStatus.enum.SYNCED, syncStatus.enum.SYNCING])),
				isNull(annotations.deletedAt),
			),
		)
		.all()

const fetchDeletedAnnotations = async (serverId: string) =>
	db
		.select()
		.from(annotations)
		.where(
			and(
				eq(annotations.serverId, serverId),
				isNotNull(annotations.deletedAt),
				isNotNull(annotations.serverAnnotationId),
			),
		)
		.all()

const markSyncStatus = async (ids: number | number[], status: SyncStatus) => {
	const idArray = Array.isArray(ids) ? ids : [ids]
	if (idArray.length === 0) return
	await db
		.update(annotations)
		.set({ syncStatus: status })
		.where(inArray(annotations.id, idArray))
		.run()
}

const handleCreateAnnotation = async (api: Api, annotation: Annotation) => {
	const locator = annotationLocator.parse(annotation.locator)

	const result = await api.execute(createMutation, {
		input: {
			mediaId: annotation.bookId,
			locator: {
				chapterTitle: locator.chapterTitle ?? undefined,
				href: locator.href,
				title: locator.title,
				type: locator.type ?? undefined,
				locations: locator.locations,
				text: locator.text,
			},
			annotationText: annotation.annotationText,
		},
	})

	await db
		.update(annotations)
		.set({ serverAnnotationId: result.createAnnotation.id })
		.where(eq(annotations.id, annotation.id))
		.run()
}

const handleUpdateAnnotation = async (api: Api, annotation: Annotation) => {
	await api.execute(updateMutation, {
		input: {
			id: annotation.serverAnnotationId!,
			annotationText: annotation.annotationText,
		},
	})
}

const handleDeleteAnnotation = async (api: Api, annotation: Annotation) => {
	await api.execute(deleteMutation, {
		id: annotation.serverAnnotationId!,
	})
	await db.delete(annotations).where(eq(annotations.id, annotation.id)).run()
}

export const executeSingleServerAnnotationPushSync = async (
	serverId: string,
	api: Api,
	ignoreBookIds?: string[],
) => {
	const allUnsynced = await fetchUnsyncedAnnotations(serverId)
	const allDeleted = await fetchDeletedAnnotations(serverId)

	const filterIgnored = <T extends { bookId: string }>(items: T[]) =>
		ignoreBookIds?.length ? items.filter((a) => !ignoreBookIds.includes(a.bookId)) : items

	const unsyncedAnnotations = filterIgnored(allUnsynced)
	const deletedAnnotations = filterIgnored(allDeleted)

	await markSyncStatus(
		unsyncedAnnotations.map((a) => a.id),
		syncStatus.enum.SYNCING,
	)

	for (const annotation of unsyncedAnnotations) {
		try {
			if (annotation.serverAnnotationId) {
				await handleUpdateAnnotation(api, annotation)
			} else {
				await handleCreateAnnotation(api, annotation)
			}
			await markSyncStatus(annotation.id, syncStatus.enum.SYNCED)
		} catch (error) {
			console.error('Failed to push annotation', { annotationId: annotation.id, error })
			Sentry.captureException(error, { extra: { annotationId: annotation.id } })
			await markSyncStatus(annotation.id, syncStatus.enum.ERROR)
		}
	}

	for (const annotation of deletedAnnotations) {
		try {
			await handleDeleteAnnotation(api, annotation)
		} catch (error) {
			console.error('Failed to delete annotation on server', {
				annotationId: annotation.id,
				error,
			})
			Sentry.captureException(error, { extra: { annotationId: annotation.id } })
		}
	}
}

/**
 * Push local annotations to multiple servers at once
 */
export const executePushAnnotationsSync = async (
	instances: Record<string, Api>,
	ignoreBookIds?: string[],
) => {
	await Promise.all(
		Object.entries(instances).map(([serverId, api]) =>
			executeSingleServerAnnotationPushSync(serverId, api, ignoreBookIds),
		),
	)
}
