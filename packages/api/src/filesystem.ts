import type { DirectoryListing, DirectoryListingInput, Pageable } from '@stump/types'

import { API } from '.'
import { ApiResult } from './types'

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

export const filesystemApi = {
	listDirectory,
}

export const filesystemQueryKeys: Record<keyof typeof filesystemApi, string> = {
	listDirectory: 'filesystem.listDirectory',
}
