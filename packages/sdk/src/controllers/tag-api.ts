import { Tag } from '@stump/types'

import { APIBase } from '../base'
import { ClassQueryKeys } from './types'
import { createRouteURLHandler } from './utils'

/**
 * The root route for the tag API
 */
const TAG_ROUTE = '/tags'
/**
 * A helper function to format the URL for tags API routes with optional query parameters
 */
const tagURL = createRouteURLHandler(TAG_ROUTE)

/**
 * The smartlist API controller, used for interacting with the smartlist endpoints of the Stump API
 */
export class TagAPI extends APIBase {
	/**
	 * Fetch all tags
	 */
	async get(): Promise<Tag[]> {
		const { data: tags } = await this.axios.get<Tag[]>(tagURL(''))
		return tags
	}

	/**
	 * Create tags from an array of strings. Any existing tags will be ignored.
	 */
	async create(tags: string[]): Promise<Tag[]> {
		const { data: createdTags } = await this.axios.post<Tag[]>(tagURL(''), { tags })
		return createdTags
	}

	/**
	 * The query keys for the tag API, used for caching
	 */
	get keys(): ClassQueryKeys<InstanceType<typeof TagAPI>> {
		return {
			create: 'tag.create',
			get: 'tag.get',
		}
	}
}
