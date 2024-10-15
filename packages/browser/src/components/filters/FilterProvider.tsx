import { toObjectParams, toUrlParams } from '@stump/sdk'
import React, { useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'

import { FilterContext } from './context'

// TODO: clean up this file!

type Props = {
	children: React.ReactNode
}

/**
 * A context provider to handle filter state. This component is used throughout the
 * entity overview pages (e.g. /media, /series, etc.)
 */
export default function FilterProvider({ children }: Props) {
	const [filters, setFilters] = useSearchParams()

	/**
	 * An object representation of the url params
	 */
	const params = useMemo(
		() =>
			toObjectParams<Record<string, unknown>>(filters, { ignoreKeys: ['page'], removeEmpty: true }),
		[filters],
	)

	/**
	 * An object representation of the ordering params
	 */
	const ordering = useMemo(
		() => ({
			direction: params?.direction as 'asc' | 'desc' | undefined,
			order_by: params?.order_by as string | undefined,
		}),
		[params],
	)

	/**
	 * Replace the current filters with the provided filters
	 */
	const handleSetFilters = (newFilters: Record<string, unknown>) => {
		setFilters(toUrlParams(newFilters, undefined, { removeEmpty: true }))
	}

	/**
	 * Sets a single filter in the url with the provided value
	 */
	const handleSetFilter = (key: string, value: unknown) => {
		setFilters((prev) => {
			const params = toObjectParams<Record<string, unknown>>(prev)
			params[key] = value
			return toUrlParams(params)
		})
	}

	/**
	 * Removes a filter from the url
	 */
	const handleRemoveFilter = (key: string) => {
		setFilters((prev) => {
			const params = toObjectParams<Record<string, unknown>>(prev)
			delete params[key]
			return toUrlParams(params)
		})
	}

	return (
		<FilterContext.Provider
			value={{
				filters: params,
				ordering,
				removeFilter: handleRemoveFilter,
				setFilter: handleSetFilter,
				setFilters: handleSetFilters,
			}}
		>
			{children}
		</FilterContext.Provider>
	)
}

/**
 * A context provider to handle filter state where everything is local state.
 */
export function ManualFilterProvider({ children }: Props) {
	const [filters, setFilters] = React.useState<Record<string, unknown>>({})

	/**
	 * An object representation of the ordering params
	 */
	const ordering = useMemo(
		() => ({
			direction: filters?.direction as 'asc' | 'desc' | undefined,
			order_by: filters?.order_by as string | undefined,
		}),
		[filters],
	)

	/**
	 * Replace the current filters with the provided filters
	 */
	const handleSetFilters = (newFilters: Record<string, unknown>) => {
		setFilters(newFilters)
	}

	/**
	 * Sets a single filter in the url with the provided value
	 */
	const handleSetFilter = (key: string, value: unknown) => {
		setFilters((prev) => {
			const params = { ...prev }
			params[key] = value
			return params
		})
	}

	/**
	 * Removes a filter from the url
	 */
	const handleRemoveFilter = (key: string) => {
		setFilters((prev) => {
			const params = { ...prev }
			delete params[key]
			return params
		})
	}

	return (
		<FilterContext.Provider
			value={{
				filters,
				ordering,
				removeFilter: handleRemoveFilter,
				setFilter: handleSetFilter,
				setFilters: handleSetFilters,
			}}
		>
			{children}
		</FilterContext.Provider>
	)
}
