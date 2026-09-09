import { AxiosRequestConfig } from 'axios'
import { XMLParser } from 'fast-xml-parser'

import { APIBase } from '../base'
import {
	legacyFeed,
	OPDSLegacyFeed,
	OPDSLegacyOpenSearchDoc,
	openSearchDoc,
} from '../types/opds-legacy'
import { createRouteURLHandler, resolveUrl, toUrlParams, urlWithParams } from './utils'

/**
 * The root route for the OPDS v2 API
 */
const OPDS_V2_ROUTE = '/opds/v1.2'
/**
 * A helper function to format the URL for OPDS v2 API routes with optional query parameters
 */
export const opdsURL = createRouteURLHandler(OPDS_V2_ROUTE)

type OPDSPageQuery = {
	page: number
	page_size: number
}

export class OPDSLegacyAPI extends APIBase {
	private xmlParser = new XMLParser({
		ignoreAttributes: false,
		attributeNamePrefix: '',
	})

	get config(): AxiosRequestConfig {
		return {
			baseURL: this.serviceURL.replace(/\/api(\/.+)?$/, ''),
		}
	}

	async catalog(): Promise<OPDSLegacyFeed> {
		const { data: xmlData } = await this.axios.get(opdsURL('/catalog'), this.config)
		const data = this.xmlParser.parse(xmlData)
		if (typeof data !== 'object' || data?.feed == null) {
			throw new Error('Invalid OPDS feed format')
		}
		return legacyFeed.parse(data.feed)
	}

	async feed(url: string, params?: OPDSPageQuery): Promise<OPDSLegacyFeed> {
		const absoluteUrl = resolveUrl(url, this.api.rootURL)
		const resolvedURL = urlWithParams(absoluteUrl, toUrlParams(params))
		const { data: xmlData } = await this.axios.get(resolvedURL, {
			baseURL: undefined,
		})
		const data = this.xmlParser.parse(xmlData)
		if (typeof data !== 'object' || data?.feed == null) {
			throw new Error('Invalid OPDS feed format')
		}
		return legacyFeed.parse(data.feed)
	}

	async searchDocument(url: string): Promise<OPDSLegacyOpenSearchDoc> {
		const absoluteUrl = resolveUrl(url, this.api.rootURL)
		const { data: xmlData } = await this.axios.get(absoluteUrl, {
			baseURL: undefined,
		})
		const data = this.xmlParser.parse(xmlData)
		if (typeof data !== 'object' || data?.['OpenSearchDescription'] == null) {
			throw new Error('Invalid OPDS OpenSearch document format')
		}
		return openSearchDoc.parse(data['OpenSearchDescription'])
	}
}
