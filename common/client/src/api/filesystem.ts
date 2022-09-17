import { ApiResult, DirectoryListing, DirectoryListingInput } from '@stump/core';
import { API } from '.';

export function listDirectory(input?: DirectoryListingInput): Promise<ApiResult<DirectoryListing>> {
	return API.post('/filesystem', input);
}
