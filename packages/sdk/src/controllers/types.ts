import { AnyFunction } from 'ts-essentials'

import { APIError, Pageable, PaginationQuery, QueryOrder } from '../types'

// TODO(upload): just rely on generated code
export {
	type UploaderParams,
	type UploadLibraryBooks,
	type UploadLibrarySeries,
} from './upload-api'

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

export type QueryOrderParams = Partial<QueryOrder>

export type FullQueryParams<Filters> = Filters & PaginationQuery & QueryOrderParams

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
