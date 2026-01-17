import { and, eq, isNull } from 'drizzle-orm'
import { useLiveQuery } from 'drizzle-orm/expo-sqlite'
import { useCallback, useMemo } from 'react'

import { db, syncStatus } from '~/db'
import { annotationLocator, AnnotationRecord, annotations, NewAnnotationRecord } from '~/db/schema'
import { Decoration, ReadiumLocator } from '~/modules/readium'

import { useEpubTheme } from './epub'

function recordToDecoration(record: AnnotationRecord, color: string): Decoration | undefined {
	const parsed = annotationLocator.safeParse(record.locator)?.data
	if (!parsed) return undefined

	return {
		id: String(record.id),
		bookId: record.bookId,
		locator: { ...parsed, chapterTitle: parsed.chapterTitle ?? '' },
		color,
		annotationText: record.annotationText ?? undefined,
		createdAt: record.createdAt,
		updatedAt: record.updatedAt,
	}
}

type UseAnnotationsParams = {
	bookId: string
	serverId: string
}

export function useAnnotations({ bookId, serverId }: UseAnnotationsParams) {
	const { colors } = useEpubTheme()

	const highlightColor = colors?.highlight ?? '#FFEB3B'

	const { data: records } = useLiveQuery(
		db
			.select()
			.from(annotations)
			.where(and(eq(annotations.bookId, bookId), isNull(annotations.deletedAt))),
		[bookId],
	)

	const annotationList = useMemo(() => {
		return (records ?? [])
			.map((r) => recordToDecoration(r, highlightColor))
			.filter((d): d is Decoration => d !== undefined)
	}, [records, highlightColor])

	const addAnnotation = useCallback(
		async (locator: ReadiumLocator, annotationText?: string) => {
			const now = new Date()
			const newAnnotation: NewAnnotationRecord = {
				bookId,
				serverId,
				locator: locator as unknown as Record<string, unknown>,
				annotationText,
				createdAt: now,
				updatedAt: now,
				syncStatus: syncStatus.enum.UNSYNCED,
			}

			const result = await db
				.insert(annotations)
				.values(newAnnotation)
				.returning({ id: annotations.id })
			return String(result[0]?.id || '')
		},
		[bookId, serverId],
	)

	const updateAnnotation = useCallback(
		async (annotationId: string, annotationText: string | null) => {
			await db
				.update(annotations)
				.set({
					annotationText,
					updatedAt: new Date(),
					syncStatus: syncStatus.enum.UNSYNCED,
				})
				.where(eq(annotations.id, parseInt(annotationId, 10)))
		},
		[],
	)

	const deleteAnnotation = useCallback(
		async (annotationId: string) => {
			const numericId = parseInt(annotationId, 10)
			const record = records?.find((r) => r.id === numericId)
			if (!record) return

			if (record.serverAnnotationId) {
				await db
					.update(annotations)
					.set({ deletedAt: new Date() })
					.where(eq(annotations.id, numericId))
			} else {
				// Note: if not synced we don't care about soft delete
				await db.delete(annotations).where(eq(annotations.id, numericId))
			}
		},
		[records],
	)

	const getAnnotation = useCallback(
		(annotationId: string): Decoration | undefined => {
			return annotationList.find((h) => h.id === annotationId)
		},
		[annotationList],
	)

	return {
		annotations: annotationList,
		addAnnotation,
		updateAnnotation,
		deleteAnnotation,
		getAnnotation,
	}
}

export type UseAnnotationsReturn = ReturnType<typeof useAnnotations>
