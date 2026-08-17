import { useGraphQLMutation } from '@stump/client'
import {
	CreateAnnotationInput,
	graphql,
	ReadiumLocatorInput,
	type ReadiumWebReaderQuery,
} from '@stump/graphql'
import { useLocaleContext } from '@stump/i18n'
import { useQueryClient } from '@tanstack/react-query'
import { useCallback, useMemo, useSyncExternalStore } from 'react'
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
	const { t } = useLocaleContext()
	const queryClient = useQueryClient()
	const queryKey = useMemo(() => ['readiumWebReader', mediaId] as const, [mediaId])
	const cachedAnnotations = useSyncExternalStore(
		(onStoreChange) => queryClient.getQueryCache().subscribe(onStoreChange),
		() => queryClient.getQueryData<ReadiumWebReaderQuery>(queryKey)?.epubById?.annotations ?? null,
		() => null,
	)
	const annotations = useMemo(
		() => cachedAnnotations?.map(graphqlAnnotationToEpubAnnotation) ?? initialAnnotations,
		[cachedAnnotations, initialAnnotations],
	)
	const updateCachedAnnotations = useCallback(
		(transform: (annotations: EpubAnnotation[]) => EpubAnnotation[]) => {
			queryClient.setQueryData<ReadiumWebReaderQuery>(queryKey, (data) => {
				if (!data?.epubById) return data
				const annotations = data.epubById.annotations.map(graphqlAnnotationToEpubAnnotation)
				return {
					...data,
					epubById: {
						...data.epubById,
						annotations: transform(annotations) as typeof data.epubById.annotations,
					},
				}
			})
		},
		[queryClient, queryKey],
	)

	const { mutate: createMutation, isPending: isCreating } = useGraphQLMutation(_createMutation, {
		mutationKey: ['createEpubAnnotation', mediaId],
		onMutate: async ({ input }) => {
			await queryClient.cancelQueries({ queryKey })
			const previous = queryClient.getQueryData<ReadiumWebReaderQuery>(queryKey)
			const optimisticId = makeOptimisticId()

			updateCachedAnnotations((annotations) => [
				...annotations,
				{
					id: optimisticId,
					mediaId,
					userId: '',
					annotationText: input.annotationText ?? null,
					createdAt: new Date().toISOString(),
					updatedAt: new Date().toISOString(),
					locator: readiumLocatorInputToReaderLocator(input.locator),
				},
			])

			return { optimisticId, previous }
		},
		onSuccess: ({ createAnnotation }, _variables, context) => {
			updateCachedAnnotations((annotations) =>
				annotations.map((annotation) =>
					annotation.id === context.optimisticId
						? graphqlAnnotationToEpubAnnotation(createAnnotation)
						: annotation,
				),
			)
		},
		onError: (error, _variables, context) => {
			queryClient.setQueryData(queryKey, context?.previous)
			console.error('[useEpubAnnotations] createAnnotation failed', error)
			toast.error(t('epubReader.annotation.saveFailed'))
		},
		onSettled: () => queryClient.invalidateQueries({ queryKey }),
	})
	const { mutate: updateMutation, isPending: isUpdating } = useGraphQLMutation(_updateMutation, {
		mutationKey: ['updateEpubAnnotation', mediaId],
		onMutate: async ({ input }) => {
			await queryClient.cancelQueries({ queryKey })
			const previous = queryClient.getQueryData<ReadiumWebReaderQuery>(queryKey)

			updateCachedAnnotations((annotations) =>
				annotations.map((annotation) =>
					annotation.id === input.id
						? {
								...annotation,
								annotationText: input.annotationText,
								updatedAt: new Date().toISOString(),
							}
						: annotation,
				),
			)

			return { previous }
		},
		onError: (error, _variables, context) => {
			queryClient.setQueryData(queryKey, context?.previous)
			console.error('[useEpubAnnotations] updateAnnotation failed', error)
			toast.error(t('epubReader.annotation.updateFailed'))
		},
		onSettled: () => queryClient.invalidateQueries({ queryKey }),
	})
	const { mutate: deleteMutation, isPending: isDeleting } = useGraphQLMutation(_deleteMutation, {
		mutationKey: ['deleteEpubAnnotation', mediaId],
		onMutate: async ({ id }) => {
			await queryClient.cancelQueries({ queryKey })
			const previous = queryClient.getQueryData<ReadiumWebReaderQuery>(queryKey)
			updateCachedAnnotations((annotations) =>
				annotations.filter((annotation) => annotation.id !== id),
			)

			return { previous }
		},
		onError: (error, _variables, context) => {
			queryClient.setQueryData(queryKey, context?.previous)
			console.error('[useEpubAnnotations] deleteAnnotation failed', error)
			toast.error(t('epubReader.annotation.deleteFailed'))
		},
		onSettled: () => queryClient.invalidateQueries({ queryKey }),
	})

	const createAnnotation = useCallback(
		(locator: ReaderLocator, annotationText?: string) => {
			if (isIncognito) {
				toast.info(t('epubReader.annotation.disabledInIncognito'))
				return undefined
			}

			const input: CreateAnnotationInput = {
				mediaId,
				locator: readerLocatorToInput(locator),
				annotationText: annotationText || undefined,
			}

			return createMutation({ input })
		},
		[mediaId, isIncognito, createMutation, t],
	)

	const updateAnnotation = useCallback(
		(id: string, annotationText: string | null) => {
			if (isIncognito) return

			return updateMutation({ input: { id, annotationText } })
		},
		[isIncognito, updateMutation],
	)

	const deleteAnnotation = useCallback(
		(id: string) => {
			if (isIncognito) return

			return deleteMutation({ id })
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

function readiumLocatorInputToReaderLocator(locator: ReadiumLocatorInput): ReaderLocator {
	return {
		chapterTitle: locator.chapterTitle ?? locator.title ?? '',
		href: locator.href,
		title: locator.title ?? undefined,
		type: locator.type ?? 'application/xhtml+xml',
		locations: locator.locations
			? {
					fragments: locator.locations.fragments ?? undefined,
					position: locator.locations.position ?? undefined,
					progression: locator.locations.progression ?? undefined,
					totalProgression: locator.locations.totalProgression ?? undefined,
					cssSelector: locator.locations.cssSelector ?? undefined,
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
