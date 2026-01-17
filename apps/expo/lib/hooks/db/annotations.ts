import { useMutation } from '@tanstack/react-query'
import { eq } from 'drizzle-orm'
import { useCallback } from 'react'

import { db } from '~/db/client'
import { annotations as annotationsTable, syncStatus } from '~/db/schema'
import { ReadiumLocator } from '~/modules/readium'

type UseAnnotationMutationsParams = {
	bookId: string
	serverId: string
}

type CreateAnnotationParams = {
	locator: ReadiumLocator
	annotationText?: string
}

type UpdateAnnotationParams = {
	annotationId: number
	annotationText: string | null
}

export function useLocalAnnotationMutations({ bookId, serverId }: UseAnnotationMutationsParams) {
	const { mutateAsync: createAnnotationMutation } = useMutation({
		mutationFn: async ({ locator, annotationText }: CreateAnnotationParams) => {
			const [inserted] = await db
				.insert(annotationsTable)
				.values({
					bookId,
					serverId,
					locator: locator as unknown as Record<string, unknown>,
					annotationText: annotationText ?? null,
					syncStatus: syncStatus.enum.UNSYNCED,
				})
				.returning({ id: annotationsTable.id })
			return { id: String(inserted?.id || '') }
		},
		onError: (error) => {
			console.error('Failed to create offline annotation:', error)
		},
	})

	const { mutateAsync: updateAnnotationMutation } = useMutation({
		mutationFn: async ({ annotationId, annotationText }: UpdateAnnotationParams) => {
			await db
				.update(annotationsTable)
				.set({
					annotationText,
					updatedAt: new Date(),
					syncStatus: syncStatus.enum.UNSYNCED,
				})
				.where(eq(annotationsTable.id, annotationId))
		},
		onError: (error) => {
			console.error('Failed to update offline annotation:', error)
		},
	})

	const { mutateAsync: deleteAnnotationMutation } = useMutation({
		mutationFn: async (annotationId: number) => {
			await db
				.update(annotationsTable)
				.set({
					deletedAt: new Date(),
					syncStatus: syncStatus.enum.UNSYNCED,
				})
				.where(eq(annotationsTable.id, annotationId))
		},
		onError: (error) => {
			console.error('Failed to delete offline annotation:', error)
		},
	})

	const createAnnotation = useCallback(
		async (locator: ReadiumLocator, annotationText?: string) => {
			return createAnnotationMutation({ locator, annotationText })
		},
		[createAnnotationMutation],
	)

	const updateAnnotation = useCallback(
		async (annotationId: string, annotationText: string | null) => {
			const id = parseInt(annotationId, 10)
			if (isNaN(id)) {
				console.error('Invalid annotationId provided to updateAnnotation:', annotationId)
				return
			}
			await updateAnnotationMutation({ annotationId: id, annotationText })
		},
		[updateAnnotationMutation],
	)

	const deleteAnnotation = useCallback(
		async (annotationId: string) => {
			const id = parseInt(annotationId, 10)
			if (isNaN(id)) {
				console.error('Invalid annotationId provided to deleteAnnotation:', annotationId)
				return
			}
			await deleteAnnotationMutation(id)
		},
		[deleteAnnotationMutation],
	)

	return {
		createAnnotation,
		updateAnnotation,
		deleteAnnotation,
	}
}
