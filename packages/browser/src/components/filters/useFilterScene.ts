import {
	MediaFilterInput,
	MediaModelOrdering,
	MediaOrderBy,
	OrderDirection,
	SeriesFilterInput,
	SeriesModelOrdering,
	SeriesOrderBy,
} from '@stump/graphql'
import { toObjectParams, toUrlParams } from '@stump/sdk'
import { useCallback, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useMediaMatch } from 'rooks'

import { FilterInput, IFilterContext, Ordering, OrderingField } from './context'

type Return = IFilterContext

export const DEFAULT_SERIES_ORDER_BY: SeriesOrderBy[] = [
	{ series: { field: SeriesModelOrdering.Name, direction: OrderDirection.Asc } },
] as SeriesOrderBy[]

export const DEFAULT_MEDIA_ORDER_BY: MediaOrderBy[] = [
	{ media: { field: MediaModelOrdering.Name, direction: OrderDirection.Asc } },
] as MediaOrderBy[]

export const useURLPageParams = () => {
	const [searchParams, setSearchParams] = useSearchParams()

	const is3XLScreenOrBigger = useMediaMatch('(min-width: 1600px)')
	const defaultPageSize = is3XLScreenOrBigger ? 40 : 20

	const pagination = useMemo(
		() => ({
			page: searchParams.get('page') ? parseInt(searchParams.get('page') as string) : 1,
			pageSize: searchParams.get('pageSize')
				? parseInt(searchParams.get('pageSize') as string)
				: defaultPageSize,
		}),
		[searchParams, defaultPageSize],
	)

	const setPage = useCallback(
		(page: number) => {
			setSearchParams((prev) => {
				prev.set('page', page.toString())
				return prev
			})
		},
		[setSearchParams],
	)

	const setPageSize = useCallback(
		(pageSize: number) => {
			setSearchParams((prev) => {
				prev.set('pageSize', pageSize.toString())
				return prev
			})
		},
		[setSearchParams],
	)

	return { ...pagination, setPage, setPageSize }
}

export const useURLKeywordSearch = () => {
	const [searchParams, setSearchParams] = useSearchParams()

	const search = useMemo(() => {
		const searchValue = searchParams.get('search')
		return searchValue ? decodeURIComponent(searchValue) : ''
	}, [searchParams])

	const setSearch = useCallback(
		(newSearch: string) => {
			setSearchParams((prev) => {
				if (newSearch) {
					prev.set('search', encodeURIComponent(newSearch))
				} else {
					prev.delete('search')
				}
				return prev
			})
		},
		[setSearchParams],
	)

	const removeSearch = useCallback(() => {
		setSearchParams((prev) => {
			prev.delete('search')
			return prev
		})
	}, [setSearchParams])

	return { search, setSearch, removeSearch }
}

export function useSearchMediaFilter(search: string | undefined): MediaFilterInput[] | undefined {
	return useMemo(() => {
		if (!search) return undefined
		return [
			{
				name: { contains: search },
			},
			{
				metadata: {
					summary: { contains: search },
				},
			},
			{
				metadata: {
					title: { contains: search },
				},
			},
		] as MediaFilterInput[]
	}, [search])
}

export function useSearchSeriesFilter(search: string | undefined): SeriesFilterInput[] | undefined {
	return useMemo(() => {
		if (!search) return undefined
		return [
			{
				name: { contains: search },
			},
			{
				metadata: {
					summary: { contains: search },
				},
			},
			{
				metadata: {
					title: { contains: search },
				},
			},
		] as SeriesFilterInput[]
	}, [search])
}

export function useFilterScene(): Return {
	const [searchParams, setSearchParams] = useSearchParams()
	const [search, setSearch] = useState<string | undefined>(undefined)

	const is3XLScreenOrBigger = useMediaMatch('(min-width: 1600px)')
	const defaultPageSize = is3XLScreenOrBigger ? 40 : 20

	/**
	 * An object representation of the url params without the excluded keys, such as
	 * order_by, direction, search, page, and pageSize.
	 */
	const filters = useMemo(() => {
		const filtersJsonStr = searchParams.get('filters')
		const filters: FilterInput = filtersJsonStr ? JSON.parse(filtersJsonStr) : {}
		return filters
	}, [searchParams])

	/**
	 * An object representation of the ordering params
	 */
	const ordering = useMemo(
		() => ({
			order_by: searchParams.get('order_by') as OrderingField,
			direction: searchParams.get('direction') as OrderDirection,
		}),
		[searchParams],
	)

	/**
	 * An object representation of the pagination params
	 */
	const pagination = useMemo(
		() => ({
			page: searchParams.get('page') ? parseInt(searchParams.get('page') as string) : 1,
			pageSize: searchParams.get('pageSize')
				? parseInt(searchParams.get('pageSize') as string)
				: defaultPageSize,
		}),
		[searchParams, defaultPageSize],
	)

	const setOrdering = useCallback(
		(newOrdering: Ordering) => {
			setSearchParams(
				toUrlParams(
					{
						...pagination,
						...newOrdering,
						filters: JSON.stringify(filters),
					},
					undefined,
					{ removeEmpty: true },
				),
			)
		},
		[setSearchParams, pagination, filters],
	)

	const setPage = useCallback(
		(page: number) => {
			setSearchParams((prev) => {
				prev.set('page', page.toString())
				return prev
			})
		},
		[setSearchParams],
	)

	/**
	 * Replace the current filters with the provided filters
	 */
	const handleSetFilters = useCallback(
		(newFilters: FilterInput) => {
			setSearchParams(
				toUrlParams(
					{
						...ordering,
						...pagination,
						filters: JSON.stringify(newFilters),
					},
					undefined,
					{ removeEmpty: true },
				),
			)
		},
		[ordering, pagination, setSearchParams],
	)

	/**
	 * Sets a single filter in the url with the provided value
	 */
	const handleSetSearch = useCallback(
		(value: string) => {
			setSearchParams((prev) => {
				const params = toObjectParams<Record<string, unknown>>(prev)
				params['search'] = value
				setSearch(value)
				return toUrlParams(params)
			})
		},
		[setSearchParams],
	)

	/**
	 * Removes a filter from the url
	 */
	const removeSearch = useCallback(() => {
		setSearchParams((prev) => {
			prev.delete('search')
			return prev
		})
	}, [setSearchParams])

	return {
		filters,
		ordering,
		pagination,
		removeSearch,
		search,
		setSearch: handleSetSearch,
		setFilters: handleSetFilters,
		setOrdering,
		setPage,
	}
}

export function useMediaURLOrderBy(ordering: Ordering): MediaOrderBy[] {
	return useMemo(() => {
		// check for undefined values
		if (!ordering || !ordering.order_by || !ordering.direction) {
			return DEFAULT_MEDIA_ORDER_BY
		}

		return [
			{
				media: {
					field: ordering.order_by as MediaModelOrdering,
					direction: ordering.direction as OrderDirection,
				},
			},
		] as MediaOrderBy[]
	}, [ordering])
}
