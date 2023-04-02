import { Library, Media, PageParams, QueryOrder, Series } from '@stump/types'
import { createContext } from 'react'

export const DEFAULT_ORDER_BY = 'name'
export const DEFAULT_ORDER_DIRECTION = 'asc'
export const DEFAULT_PAGE_SIZE = 20

export type SupportedEntity = Media | Series | Library
export type Filters = {
	show_unsupported?: boolean
} & Pick<PageParams, 'page_size'> &
	QueryOrder
export type FilterContext = Partial<
	{
		filters?: Record<string, string>
		searchParams?: URLSearchParams
	} & Filters
>

const defaultFilters: FilterContext = {
	direction: DEFAULT_ORDER_DIRECTION,
	order_by: DEFAULT_ORDER_BY,
	page_size: DEFAULT_PAGE_SIZE,
}

export const createFilterContext = <Context extends FilterContext = FilterContext>(
	defaultValues?: Context,
) =>
	// FIXME: potentially unsafe cast
	createContext<Context>(defaultValues || (defaultFilters as Context))
