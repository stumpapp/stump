import { APIBase } from '../base'
import { MetadataSourceEntry } from '../types'

// TODO - Adjust this route during finalization
/**
 * The root route for the metadata sources API.
 *
 */
const METADATA_SOURCES_ROUTE = '/config/metadata_sources'

export class MetadataSourcesAPI extends APIBase {
	/**
	 * Fetch all metadata sources.
	 */
	async get(): Promise<MetadataSourceEntry[]> {
		const { data: sources } = await this.axios.get<MetadataSourceEntry[]>(METADATA_SOURCES_ROUTE)
		return sources
	}

	/**
	 * Update an existing metadata source to match the input parameter.
	 */
	async putMetadataSource(source: MetadataSourceEntry): Promise<void> {
		await this.axios.put(METADATA_SOURCES_ROUTE, source)
	}
}
