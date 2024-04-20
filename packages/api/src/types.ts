import { APIError, Pageable } from '@stump/types'

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
