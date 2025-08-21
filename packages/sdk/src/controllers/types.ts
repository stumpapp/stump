import { AnyFunction } from 'ts-essentials'

import { APIError } from '../types'

export type { JwtTokenPair, LoginResponse, PasswordUserInput } from './auth-api'
export {
	type UploaderParams,
	type UploadLibraryBooks,
	type UploadLibrarySeries,
} from './upload-api'

export type APIResult<T> = import('axios').AxiosResponse<T, import('axios').AxiosError<APIError>>

// TODO(types): figure out how to generalize the postfix URL ignore, e.g. MyType<T extends string> = `${T}URL`
export type ClassQueryKeys<T> = Omit<
	{
		[P in keyof T]: T[P] extends AnyFunction ? string : never
	},
	| 'keys'
	| 'configuration'
	| 'thumbnailURL'
	| 'downloadURL'
	| 'bookPageURL'
	| 'axios'
	| 'withServiceURL'
	| 'serviceURL'
	| 'libraryThumbnailURL'
	| 'seriesThumbnailURL'
	| 'bookThumbnailURL'
	| 'bookFileURL'
	| 'imageURL'
>
