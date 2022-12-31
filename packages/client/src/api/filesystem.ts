import type { ApiResult, DirectoryListing, DirectoryListingInput, Pageable } from '../types'
import { API } from '.'

interface ListDirectoryFnInput extends DirectoryListingInput {
	page?: number
}

export function listDirectory(
	input?: ListDirectoryFnInput,
): Promise<ApiResult<Pageable<DirectoryListing>>> {
	if (input?.page != null) {
		return API.post(`/filesystem?page=${input.page}`, input)
	}

	return API.post('/filesystem', input)
}
