import { toObjectParams, toUrlParams } from '@stump/api'
import React, { useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'

import { FilterContext } from './context_new'

type Props = {
	children: React.ReactNode
}
export default function FilterProvider({ children }: Props) {
	const [filters, setFilters] = useSearchParams()

	/**
	 * An object representation of the url params
	 */
	const params = useMemo(
		() => toObjectParams<Record<string, unknown>>(filters, ['page']),
		[filters],
	)

	/**
	 * Replace the current filters with the provided filters
	 */
	const handleSetFilters = (newFilters: Record<string, unknown>) => {
		setFilters(toUrlParams(newFilters))
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
				removeFilter: handleRemoveFilter,
				setFilter: handleSetFilter,
				setFilters: handleSetFilters,
			}}
		>
			{children}
		</FilterContext.Provider>
	)
}
