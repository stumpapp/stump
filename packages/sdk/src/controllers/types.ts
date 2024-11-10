import { AnyFunction } from 'ts-essentials'

import { APIError, FilterBody, Pageable, PaginationQuery, QueryOrder } from '../types'

export type APIResult<T> = import('axios').AxiosResponse<T, import('axios').AxiosError<APIError>>
export type PageableAPIResult<T> = APIResult<Pageable<T>>

export type PagedQueryParams = {
	page?: number
	page_size?: number
	params?: Record<string, unknown>
}

export type CursorQueryParams = {
	cursor?: string
	limit?: number
	params?: Record<string, unknown>
}

export type QueryOrderParams<O> = Partial<QueryOrder<O>>

export type FullQueryParams<Filters, Order = never> = Filters &
	PaginationQuery &
	QueryOrderParams<Order>

/**
 * The body of a smart search request
 */
export type SmartSearchBody<F, O> = FilterBody<F, O> & {
	/**
	 * The query which will be used in the *query string* of the request,
	 * e.g. `?query=...`. This is *not* the body of the request, but included in
	 * this union for convenience.
	 */
	query?: PaginationQuery
}

// TODO(types): figure out how to generalize the postfix URL ignore, e.g. MyType<T extends string> = `${T}URL`
export type ClassQueryKeys<T> = Omit<
	{
		[P in keyof T]: T[P] extends AnyFunction ? string : never
	},
	| 'keys'
	| 'thumbnailURL'
	| 'downloadURL'
	| 'bookPageURL'
	| 'axios'
	| 'withServiceURL'
	| 'serviceURL'
>
