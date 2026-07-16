import { useGraphQLMutation } from '@stump/client'
import { CreateAnnotationInput, graphql, ReadiumLocatorInput } from '@stump/graphql'
import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'

import type { ReaderLocator } from '../context'
import type { EpubAnnotation } from './types'

const _createMutation = graphql(`
	mutation CreateEpubAnnotation($input: CreateAnnotationInput!) {
		createAnnotation(input: $input) {
			id
			mediaId
			userId
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

const _updateMutation = graphql(`
	mutation UpdateEpubAnnotation($input: UpdateAnnotationInput!) {
		updateAnnotation(input: $input) {
			id
			annotationText
			updatedAt
		}
	}
`)

const _deleteMutation = graphql(`
	mutation DeleteEpubAnnotation($id: String!) {
		deleteAnnotation(id: $id) {
			id
		}
	}
`)

type UseEpubAnnotationsArgs = {
	mediaId: string
	isIncognito: boolean
	initialAnnotations: EpubAnnotation[]
}

/**
 * GraphQL-backed CRUD for EPUB annotations, mirroring `useEpubBookmark`. Keeps a local
 * list synced from the reader's initial query and applies optimistic updates so the
 * navigator's decorations (and `AnnotationsList`) update immediately, rolling back on
 * mutation failure.
 */
export function useEpubAnnotations({
	mediaId,
	isIncognito,
	initialAnnotations,
}: UseEpubAnnotationsArgs) {
	const [annotations, setAnnotations] = useState<EpubAnnotation[]>(initialAnnotations)

	useEffect(() => {
		setAnnotations(initialAnnotations)
	}, [initialAnnotations])

	const { mutateAsync: createMutation, isPending: isCreating } = useGraphQLMutation(_createMutation)
	const { mutateAsync: updateMutation, isPending: isUpdating } = useGraphQLMutation(_updateMutation)
	const { mutateAsync: deleteMutation, isPending: isDeleting } = useGraphQLMutation(_deleteMutation)

	const createAnnotation = useCallback(
		async (locator: ReaderLocator, annotationText?: string) => {
			if (isIncognito) {
				toast.info('Annotations are disabled in incognito mode')
				return undefined
			}

			const input: CreateAnnotationInput = {
				mediaId,
				locator: readerLocatorToInput(locator),
				annotationText: annotationText || undefined,
			}

			const optimisticId = makeOptimisticId()
			const optimistic: EpubAnnotation = {
				id: optimisticId,
				mediaId,
				userId: '',
				annotationText: annotationText ?? null,
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString(),
				locator,
			}
			setAnnotations((prev) => [...prev, optimistic])

			try {
				const { createAnnotation: created } = await createMutation({ input })
				setAnnotations((prev) =>
					prev.map((annotation) =>
						annotation.id === optimisticId
							? graphqlAnnotationToEpubAnnotation(created)
							: annotation,
					),
				)
				return created.id
			} catch (error) {
				setAnnotations((prev) => prev.filter((annotation) => annotation.id !== optimisticId))
				console.error('[useEpubAnnotations] createAnnotation failed', error)
				toast.error('Failed to save annotation')
				return undefined
			}
		},
		[mediaId, isIncognito, createMutation],
	)

	const updateAnnotation = useCallback(
		async (id: string, annotationText: string | null) => {
			if (isIncognito) return

			let previous: EpubAnnotation | undefined
			setAnnotations((prev) => {
				previous = prev.find((annotation) => annotation.id === id)
				return prev.map((annotation) =>
					annotation.id === id
						? { ...annotation, annotationText, updatedAt: new Date().toISOString() }
						: annotation,
				)
			})

			try {
				await updateMutation({ input: { id, annotationText } })
			} catch (error) {
				if (previous) {
					const rolledBack = previous
					setAnnotations((prev) =>
						prev.map((annotation) => (annotation.id === id ? rolledBack : annotation)),
					)
				}
				console.error('[useEpubAnnotations] updateAnnotation failed', error)
				toast.error('Failed to update annotation')
			}
		},
		[isIncognito, updateMutation],
	)

	const deleteAnnotation = useCallback(
		async (id: string) => {
			if (isIncognito) return

			let removed: EpubAnnotation | undefined
			let removedIndex = -1
			setAnnotations((prev) => {
				removedIndex = prev.findIndex((annotation) => annotation.id === id)
				removed = prev[removedIndex]
				return prev.filter((annotation) => annotation.id !== id)
			})

			try {
				await deleteMutation({ id })
			} catch (error) {
				if (removed) {
					const restored = removed
					setAnnotations((prev) => {
						const next = [...prev]
						next.splice(Math.min(removedIndex, next.length), 0, restored)
						return next
					})
				}
				console.error('[useEpubAnnotations] deleteAnnotation failed', error)
				toast.error('Failed to delete annotation')
			}
		},
		[isIncognito, deleteMutation],
	)

	return {
		annotations,
		createAnnotation,
		updateAnnotation,
		deleteAnnotation,
		isPending: isCreating || isUpdating || isDeleting,
	}
}

function makeOptimisticId(): string {
	return `optimistic-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function readerLocatorToInput(locator: ReaderLocator): ReadiumLocatorInput {
	return {
		chapterTitle: locator.chapterTitle ?? locator.title ?? '',
		href: locator.href,
		title: locator.title ?? undefined,
		type: locator.type || 'application/xhtml+xml',
		locations: locator.locations
			? {
					fragments: locator.locations.fragments ?? undefined,
					position: locator.locations.position ?? undefined,
					progression: locator.locations.progression ?? undefined,
					totalProgression: locator.locations.totalProgression ?? undefined,
					cssSelector: locator.locations.cssSelector ?? undefined,
					partialCfi: locator.locations.partialCfi ?? undefined,
				}
			: undefined,
		text: locator.text
			? {
					after: locator.text.after ?? undefined,
					before: locator.text.before ?? undefined,
					highlight: locator.text.highlight ?? undefined,
				}
			: undefined,
	}
}

export type GraphQLAnnotationLike = {
	id: string
	mediaId: string
	userId: string
	annotationText?: string | null
	createdAt: string
	updatedAt: string
	locator: GraphQLLocatorLike
}

/**
 * Maps a `MediaAnnotation` / `MediaAnnotationModel` GraphQL shape (mutation results or
 * the `epubById.annotations` query field) onto the reader's local `EpubAnnotation`.
 */
export function graphqlAnnotationToEpubAnnotation(
	annotation: GraphQLAnnotationLike,
): EpubAnnotation {
	return {
		id: annotation.id,
		mediaId: annotation.mediaId,
		userId: annotation.userId,
		annotationText: annotation.annotationText ?? null,
		createdAt: annotation.createdAt,
		updatedAt: annotation.updatedAt,
		locator: graphQLLocatorToReaderLocator(annotation.locator),
	}
}

type GraphQLLocatorLike = {
	href: string
	type: string
	title?: string | null
	chapterTitle?: string | null
	locations?: {
		fragments?: string[] | null
		progression?: number | null
		position?: number | null
		totalProgression?: number | null
		cssSelector?: string | null
		partialCfi?: string | null
	} | null
	text?: {
		after?: string | null
		before?: string | null
		highlight?: string | null
	} | null
}

function graphQLLocatorToReaderLocator(locator: GraphQLLocatorLike): ReaderLocator {
	return {
		href: locator.href,
		type: locator.type || 'application/xhtml+xml',
		title: locator.title ?? undefined,
		chapterTitle: locator.chapterTitle ?? undefined,
		locations: locator.locations
			? {
					fragments: locator.locations.fragments ?? undefined,
					progression: locator.locations.progression ?? undefined,
					position: locator.locations.position ?? undefined,
					totalProgression: locator.locations.totalProgression ?? undefined,
					cssSelector: locator.locations.cssSelector ?? undefined,
					partialCfi: locator.locations.partialCfi ?? undefined,
				}
			: undefined,
		text: locator.text
			? {
					after: locator.text.after ?? undefined,
					before: locator.text.before ?? undefined,
					highlight: locator.text.highlight ?? undefined,
				}
			: undefined,
	}
}
