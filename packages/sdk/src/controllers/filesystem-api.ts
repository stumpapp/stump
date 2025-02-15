import { APIBase } from '../base'
import { DirectoryListing, DirectoryListingInput, Pageable } from '../types'
import { ClassQueryKeys } from './types'
import { createRouteURLHandler } from './utils'

/**
 * The root route for the filesystem API
 */
const FILESYSTEM_ROUTE = '/filesystem'
/**
 * A helper function to format the URL for filesystem API routes with optional query parameters
 */
const filesystemURL = createRouteURLHandler(FILESYSTEM_ROUTE)

/**
 * The filesystem API controller, used for interacting with the filesystem endpoints of the Stump API
 */
export class FilesystemAPI extends APIBase {
	async listDirectory(
		{ page, ...input }: DirectoryListingInput & { page?: number } = { page: 1, path: null },
	): Promise<Pageable<DirectoryListing>> {
		const { data: listing } = await this.axios.post<Pageable<DirectoryListing>>(
			filesystemURL('', { page }),
			input,
		)
		return listing
	}

	/**
	 * The query keys for the filesystem API, used for caching
	 */
	get keys(): ClassQueryKeys<InstanceType<typeof FilesystemAPI>> {
		return {
			listDirectory: 'filesystem.listDirectory',
		}
	}
}
