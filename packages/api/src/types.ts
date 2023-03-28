import { ApiError, Pageable } from '@stump/types'

export type ApiResult<T> = import('axios').AxiosResponse<T, import('axios').AxiosError<ApiError>>
export type PageableApiResult<T> = ApiResult<Pageable<T>>

export type PagedQueryParams = {
	page: number
	params?: URLSearchParams
}
