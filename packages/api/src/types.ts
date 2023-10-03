import { ApiError, Pageable } from '@stump/types'

export type ApiResult<T> = import('axios').AxiosResponse<T, import('axios').AxiosError<ApiError>>
export type PageableApiResult<T> = ApiResult<Pageable<T>>

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
