import { MediaMetadataFilter, MediaMetadataOverview } from '@stump/types'

import { APIBase } from '../base'
import { ClassQueryKeys } from './types'
import { createRouteURLHandler } from './utils'

/**
 * The root route for the metadata API
 */
const METADATA_ROUTE = '/metadata'
/**
 * A helper function to format the URL for media-specific metadata API routes with optional query parameters
 */
const mediaMetadataURL = createRouteURLHandler(`${METADATA_ROUTE}/media`)

/**
 * The metadata API controller, used for interacting with the metadata endpoints of the Stump API
 */
export class MetadataAPI extends APIBase {
	/**
	 * Fetch an overview of the media metadata available
	 */
	async overview(params?: MediaMetadataFilter): Promise<MediaMetadataOverview> {
		const { data: overview } = await this.axios.get<MediaMetadataOverview>(
			mediaMetadataURL('overview', params),
		)
		return overview
	}

	/**
	 * Get all genres available
	 */
	async genres(): Promise<string[]> {
		const { data: genres } = await this.axios.get<string[]>(mediaMetadataURL('genres'))
		return genres
	}

	/**
	 * Get all writers available
	 */
	async writers(): Promise<string[]> {
		const { data: writers } = await this.axios.get<string[]>(mediaMetadataURL('writers'))
		return writers
	}

	/**
	 * Get all pencillers available
	 */
	async pencillers(): Promise<string[]> {
		const { data: pencillers } = await this.axios.get<string[]>(mediaMetadataURL('pencillers'))
		return pencillers
	}

	/**
	 * Get all inkers available
	 */
	async inkers(): Promise<string[]> {
		const { data: inkers } = await this.axios.get<string[]>(mediaMetadataURL('inkers'))
		return inkers
	}

	/**
	 * Get all colorists available
	 */
	async colorists(): Promise<string[]> {
		const { data: colorists } = await this.axios.get<string[]>(mediaMetadataURL('colorists'))
		return colorists
	}

	/**
	 * Get all letterers available
	 */
	async letterers(): Promise<string[]> {
		const { data: letterers } = await this.axios.get<string[]>(mediaMetadataURL('letterers'))
		return letterers
	}

	/**
	 * Get all editors available
	 */
	async editors(): Promise<string[]> {
		const { data: editors } = await this.axios.get<string[]>(mediaMetadataURL('editors'))
		return editors
	}

	/**
	 * Get all publishers available
	 */
	async publishers(): Promise<string[]> {
		const { data: publishers } = await this.axios.get<string[]>(mediaMetadataURL('publishers'))
		return publishers
	}

	/**
	 * Get all characters available
	 */
	async characters(): Promise<string[]> {
		const { data: characters } = await this.axios.get<string[]>(mediaMetadataURL('characters'))
		return characters
	}

	/**
	 * Get all teams available
	 */
	async teams(): Promise<string[]> {
		const { data: teams } = await this.axios.get<string[]>(mediaMetadataURL('teams'))
		return teams
	}

	/**
	 * The keys for the queries available on the metadata API
	 */
	get keys(): ClassQueryKeys<InstanceType<typeof MetadataAPI>> {
		return {
			characters: 'metadata.characters',
			colorists: 'metadata.colorists',
			editors: 'metadata.editors',
			genres: 'metadata.genres',
			inkers: 'metadata.inkers',
			letterers: 'metadata.letterers',
			overview: 'metadata.overview',
			pencillers: 'metadata.pencillers',
			publishers: 'metadata.publishers',
			teams: 'metadata.teams',
			writers: 'metadata.writers',
		}
	}
}
