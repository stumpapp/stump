import { toObjectParams, toUrlParams } from '@stump/sdk'
import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useMediaMatch } from 'rooks'

import { IFilterContext, Ordering } from './context'
import { EXCLUDED_FILTER_KEYS } from './utils'

type Return = IFilterContext

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

export function useFilterScene(): Return {
	const [searchParams, setSearchParams] = useSearchParams()

	const is3XLScreenOrBigger = useMediaMatch('(min-width: 1600px)')
	const defaultPageSize = is3XLScreenOrBigger ? 40 : 20

	/**
	 * An object representation of the url params without the excluded keys, such as
	 * order_by, direction, search, page, and page_size.
	 */
	const filters = useMemo(
		() =>
			toObjectParams<Record<string, unknown>>(searchParams, {
				ignoreKeys: EXCLUDED_FILTER_KEYS,
				removeEmpty: true,
			}),
		[searchParams],
	)

	/**
	 * An object representation of the ordering params
	 */
	const ordering = useMemo(
		() =>
			objectWithoutEmptyValues({
				direction: searchParams.get('direction') as 'asc' | 'desc' | undefined,
				order_by: searchParams.get('order_by') as string | undefined,
			}),
		[searchParams],
	)

	/**
	 * An object representation of the pagination params
	 */
	const pagination = useMemo(
		() => ({
			page: searchParams.get('page') ? parseInt(searchParams.get('page') as string) : 1,
			page_size: searchParams.get('page_size')
				? parseInt(searchParams.get('page_size') as string)
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
						...filters,
						...newOrdering,
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
		(newFilters: Record<string, unknown>) => {
			// setFilters(toUrlParams(newFilters, undefined, { removeEmpty: true }))
			setSearchParams(
				toUrlParams(
					{
						...ordering,
						...pagination,
						...newFilters,
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
	const handleSetFilter = useCallback(
		(key: string, value: unknown) => {
			setSearchParams((prev) => {
				const params = toObjectParams<Record<string, unknown>>(prev)
				params[key] = value
				return toUrlParams(params)
			})
		},
		[setSearchParams],
	)

	/**
	 * Removes a filter from the url
	 */
	const removeFilter = useCallback(
		(key: string) => {
			setSearchParams((prev) => {
				prev.delete(key)
				return prev
			})
		},
		[setSearchParams],
	)

	return {
		filters,
		ordering,
		pagination,
		removeFilter,
		setFilter: handleSetFilter,
		setFilters: handleSetFilters,
		setOrdering,
		setPage,
	}
}

const objectWithoutEmptyValues = (obj: Record<string, unknown>) =>
	Object.entries(obj).reduce(
		(acc, [key, value]) => {
			if (value) {
				acc[key] = value
			}
			return acc
		},
		{} as Record<string, unknown>,
	)
