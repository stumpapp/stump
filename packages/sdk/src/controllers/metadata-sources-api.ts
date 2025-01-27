import { APIBase } from '../base'
import { MetadataSourceEntry, MetadataSourceSchema } from '../types'
import { ClassQueryKeys } from './types'

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
	async getAll(): Promise<MetadataSourceEntry[]> {
		const { data: sources } = await this.axios.get(METADATA_SOURCES_ROUTE)
		return sources
	}

	async getSourceConfigSchema(name: string): Promise<MetadataSourceSchema | null> {
		const { data: config_schema } = await this.axios.get(`${METADATA_SOURCES_ROUTE}/schema`, {
			params: { name },
		})
		return config_schema
	}

	/**
	 * Update an existing metadata source to match the input parameter.
	 */
	async put(source: MetadataSourceEntry): Promise<void> {
		await this.axios.put(METADATA_SOURCES_ROUTE, source)
	}

	/**
	 * The keys for the metadata sources API
	 */
	get keys(): ClassQueryKeys<InstanceType<typeof MetadataSourcesAPI>> {
		return {
			getAll: 'metadataSources.getAll',
			getSourceConfigSchema: 'metadataSources.getSourceConfigSchema',
			put: 'metadataSources.put',
		}
	}
}
