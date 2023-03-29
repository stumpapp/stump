import {
	getInProgressMedia,
	getMedia,
	getMediaById,
	getMediaWithCursor,
	getRecentlyAddedMedia,
	updateMediaProgress,
} from '@stump/api'
import type { Media, Pageable, ReadProgress } from '@stump/types'
import { AxiosError } from 'axios'

import { InfiniteQueryOptions, QueryOptions, useInfiniteQuery, useMutation } from '../client'
import { queryClient, useQuery } from '../client'
import { QUERY_KEYS } from '../query_keys'

const MEDIA_KEYS = QUERY_KEYS.media

export const prefetchMedia = async (id: string) => {
	await queryClient.prefetchQuery([MEDIA_KEYS.getMediaById, id], () => getMediaById(id), {
		staleTime: 10 * 1000,
	})
}

type MediaQueryParams<TQueryFnData, TData = TQueryFnData> = QueryOptions<
	TQueryFnData,
	AxiosError,
	TData
>

export function useMediaByIdQuery(id: string, params: MediaQueryParams<Media> = {}) {
	const { data, ...ret } = useQuery(
		[MEDIA_KEYS.getMediaById, id],
		() => getMediaById(id).then(({ data }) => data),
		{
			keepPreviousData: false,
			...params,
		},
	)

	return { media: data, ...ret }
}

type UseMediaAfterCursorParams = Omit<
	InfiniteQueryOptions<Pageable<Media[]>, AxiosError>,
	'getNextPageParam' | 'getPreviousPageParam'
> & {
	filters?: Record<string, string>
}
export function useMediaAfterCursorQuery(
	initialCursor: string,
	limit: number,
	params: UseMediaAfterCursorParams = {},
) {
	const { filters, ...restParams } = params

	const { data, ...rest } = useInfiniteQuery(
		['media', initialCursor, limit, filters],
		async ({ pageParam }) => {
			const { data } = await getMediaWithCursor({
				afterId: pageParam || initialCursor,
				limit,
				params: new URLSearchParams(filters),
			})
			return data
		},
		{
			getNextPageParam: (lastPage) => {
				const hasData = !!lastPage.data.length
				if (!hasData) {
					return undefined
				}

				if (lastPage._cursor?.next_cursor) {
					return lastPage._cursor?.next_cursor
				}

				return undefined
			},
			getPreviousPageParam: (firstPage) => {
				const hasCursor = !!firstPage?._cursor?.current_cursor
				const isNotInitialCursor = firstPage?._cursor?.current_cursor !== initialCursor
				if (hasCursor && isNotInitialCursor) {
					return firstPage?._cursor?.current_cursor
				}
				return undefined
			},
			...restParams,
		},
	)

	const media = data ? data.pages.flatMap((page) => page.data) : []

	return {
		data,
		media,
		...rest,
	}
}

// TODO: refactor once types are better in client.ts
/** Hook for fetching media after a cursor, within a series */
export function useMediaCursor(afterId: string, seriesId: string) {
	// const searchParams = useMemo(() => {
	// 	return new URLSearchParams({ cursor: afterId, series_id: seriesId })
	// }, [afterId, seriesId])
	// const { data: media, ...rest } = useCursorQuery(
	// 	afterId,
	// 	[MEDIA_KEYS.getMediaWithCursor, afterId],
	// 	() => getMedia(searchParams),
	// )

	// return { media, ...rest }

	return { isLoading: false, media: [] }
}

export function useMediaMutation(id: string, options: QueryOptions<ReadProgress> = {}) {
	const {
		mutate: updateReadProgress,
		mutateAsync: updateReadProgressAsync,
		isLoading,
	} = useMutation(['updateReadProgress'], (page: number) => updateMediaProgress(id, page), {
		// context: StumpQueryContext,
		onError(err) {
			options.onError?.(err)
		},
		onSuccess(data) {
			options.onSuccess?.(data)
		},
	})

	return { isLoading, updateReadProgress, updateReadProgressAsync }
}

export function useRecentlyAddedMedia() {
	// return useInfinitePagedQuery(
	// 	[MEDIA_KEYS.getRecentlyAddedMedia],
	// 	getRecentlyAddedMedia,
	// 	new URLSearchParams('page_size=10'),
	// )
}

export function useContinueReading() {
	// return useInfinitePagedQuery(
	// 	[MEDIA_KEYS.getInProgressMedia],
	// 	getInProgressMedia,
	// 	new URLSearchParams('page_size=10'),
	// )
}
