import { useGraphQLMutation } from '@stump/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook } from '@testing-library/react'
import { createElement, type PropsWithChildren, useState } from 'react'
import { toast } from 'sonner'

import type { ReaderLocator } from '../../context'
import type { EpubAnnotation } from '../types'
import { useEpubAnnotations } from '../useEpubAnnotations'

jest.mock('@stump/client', () => ({
	useGraphQLMutation: jest.fn(),
}))

jest.mock('sonner', () => ({
	toast: { info: jest.fn(), error: jest.fn() },
}))

const mockedUseGraphQLMutation = jest.mocked(useGraphQLMutation)

// Hoisted so `renderHook` callbacks pass a referentially stable array — the hook syncs
// local state from `initialAnnotations` by reference, matching how the real caller
// (`ReadiumWebReader`) memoizes it from the GraphQL query result.
const NO_INITIAL_ANNOTATIONS: EpubAnnotation[] = []

function createQueryWrapper(initialAnnotations: EpubAnnotation[]) {
	return function QueryWrapper({ children }: PropsWithChildren) {
		const [queryClient] = useState(() => {
			const client = new QueryClient({
				defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
			})
			client.setQueryData(['readiumWebReader', 'media-1'], {
				epubById: { annotations: initialAnnotations },
			} as never)
			return client
		})

		return createElement(QueryClientProvider, { client: queryClient }, children)
	}
}

function buildLocator(overrides: Partial<ReaderLocator> = {}): ReaderLocator {
	return {
		href: '/resource/chapter-1.xhtml',
		type: 'application/xhtml+xml',
		chapterTitle: 'Chapter One',
		...overrides,
	}
}

function buildAnnotation(overrides: Partial<EpubAnnotation> = {}): EpubAnnotation {
	return {
		id: 'a1',
		mediaId: 'media-1',
		userId: 'user-1',
		annotationText: null,
		createdAt: '2026-01-01T00:00:00Z',
		updatedAt: '2026-01-01T00:00:00Z',
		locator: buildLocator(),
		...overrides,
	}
}

describe('useEpubAnnotations', () => {
	let createAsync: jest.Mock
	let updateAsync: jest.Mock
	let deleteAsync: jest.Mock

	beforeEach(() => {
		jest.clearAllMocks()
		createAsync = jest.fn()
		updateAsync = jest.fn()
		deleteAsync = jest.fn()

		mockedUseGraphQLMutation.mockImplementation((document: unknown) => {
			const source = String(document)
			if (source.includes('mutation CreateEpubAnnotation')) {
				return { mutateAsync: createAsync, isPending: false } as never
			}
			if (source.includes('mutation UpdateEpubAnnotation')) {
				return { mutateAsync: updateAsync, isPending: false } as never
			}
			return { mutateAsync: deleteAsync, isPending: false } as never
		})
	})

	it('optimistically adds an annotation, then reconciles it with the server response', async () => {
		createAsync.mockResolvedValue({
			createAnnotation: {
				id: 'server-1',
				mediaId: 'media-1',
				userId: 'user-1',
				annotationText: null,
				createdAt: '2026-01-01T00:00:00Z',
				updatedAt: '2026-01-01T00:00:00Z',
				locator: buildLocator(),
			},
		})

		const { result } = renderHook(
			() =>
				useEpubAnnotations({
					mediaId: 'media-1',
					isIncognito: false,
					initialAnnotations: NO_INITIAL_ANNOTATIONS,
				}),
			{ wrapper: createQueryWrapper(NO_INITIAL_ANNOTATIONS) },
		)

		expect(result.current.annotations).toHaveLength(0)

		await act(async () => {
			await result.current.createAnnotation(buildLocator())
		})

		expect(createAsync).toHaveBeenCalledTimes(1)
		expect(result.current.annotations).toHaveLength(1)
		expect(result.current.annotations[0]?.id).toBe('server-1')
	})

	it('rolls back the optimistic create when the mutation fails', async () => {
		createAsync.mockRejectedValue(new Error('network error'))

		const { result } = renderHook(
			() =>
				useEpubAnnotations({
					mediaId: 'media-1',
					isIncognito: false,
					initialAnnotations: NO_INITIAL_ANNOTATIONS,
				}),
			{ wrapper: createQueryWrapper(NO_INITIAL_ANNOTATIONS) },
		)

		await act(async () => {
			await result.current.createAnnotation(buildLocator())
		})

		expect(result.current.annotations).toHaveLength(0)
		expect(toast.error).toHaveBeenCalled()
	})

	it('rolls back an optimistic update when the mutation fails', async () => {
		updateAsync.mockRejectedValue(new Error('network error'))
		const initial = [buildAnnotation({ annotationText: 'original note' })]

		const { result } = renderHook(
			() =>
				useEpubAnnotations({ mediaId: 'media-1', isIncognito: false, initialAnnotations: initial }),
			{ wrapper: createQueryWrapper(initial) },
		)

		await act(async () => {
			await result.current.updateAnnotation('a1', 'new note')
		})

		expect(result.current.annotations[0]?.annotationText).toBe('original note')
		expect(toast.error).toHaveBeenCalled()
	})

	it('rolls back an optimistic delete when the mutation fails, restoring the original position', async () => {
		deleteAsync.mockRejectedValue(new Error('network error'))
		const initial = [buildAnnotation({ id: 'a1' }), buildAnnotation({ id: 'a2' })]

		const { result } = renderHook(
			() =>
				useEpubAnnotations({ mediaId: 'media-1', isIncognito: false, initialAnnotations: initial }),
			{ wrapper: createQueryWrapper(initial) },
		)

		await act(async () => {
			await result.current.deleteAnnotation('a1')
		})

		expect(result.current.annotations.map((annotation) => annotation.id)).toEqual(['a1', 'a2'])
		expect(toast.error).toHaveBeenCalled()
	})

	it('commits a delete when the mutation succeeds', async () => {
		deleteAsync.mockResolvedValue({ deleteAnnotation: { id: 'a1' } })
		const initial = [buildAnnotation({ id: 'a1' }), buildAnnotation({ id: 'a2' })]

		const { result } = renderHook(
			() =>
				useEpubAnnotations({ mediaId: 'media-1', isIncognito: false, initialAnnotations: initial }),
			{ wrapper: createQueryWrapper(initial) },
		)

		await act(async () => {
			await result.current.deleteAnnotation('a1')
		})

		expect(result.current.annotations.map((annotation) => annotation.id)).toEqual(['a2'])
	})

	it('disables create/update/delete and shows an info toast when incognito', async () => {
		const initial = [buildAnnotation()]

		const { result } = renderHook(
			() =>
				useEpubAnnotations({ mediaId: 'media-1', isIncognito: true, initialAnnotations: initial }),
			{ wrapper: createQueryWrapper(initial) },
		)

		await act(async () => {
			await result.current.createAnnotation(buildLocator())
			await result.current.updateAnnotation('a1', 'note')
			await result.current.deleteAnnotation('a1')
		})

		expect(createAsync).not.toHaveBeenCalled()
		expect(updateAsync).not.toHaveBeenCalled()
		expect(deleteAsync).not.toHaveBeenCalled()
		expect(toast.info).toHaveBeenCalled()
		expect(result.current.annotations).toHaveLength(1)
		expect(result.current.annotations[0]?.annotationText).toBeNull()
	})
})
