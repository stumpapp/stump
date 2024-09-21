import { APIError, Pageable } from '@stump/types'
import { AnyFunction } from 'ts-essentials'

export type APIResult<T> = import('axios').AxiosResponse<T, import('axios').AxiosError<APIError>>
export type PageableAPIResult<T> = APIResult<Pageable<T>>

export type PagedQueryParams = {
	page?: number
	page_size?: number
	params?: Record<string, unknown>
}

export type CursorQueryParams = {
	afterId?: string
	limit?: number
	params?: Record<string, unknown>
}

export type ClassQueryKeys<T> = Omit<
	{
		[P in keyof T]: T[P] extends AnyFunction ? P : never
	},
	'keys'
>
