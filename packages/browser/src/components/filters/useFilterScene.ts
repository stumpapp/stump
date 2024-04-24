import { toObjectParams, toUrlParams } from '@stump/api'
import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useMediaMatch } from 'rooks'

import { IFilterContext } from './context'
import { EXCLUDED_FILTER_KEYS } from './utils'

type Return = IFilterContext

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
