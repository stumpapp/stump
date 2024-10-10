import {
	CreateOrUpdateSmartList,
	CreateOrUpdateSmartListView,
	GetSmartListsParams,
	SmartList,
	SmartListItems,
	SmartListMeta,
	SmartListRelationOptions,
	SmartListView,
} from '../types'

import { APIBase } from '../base'
import { ClassQueryKeys } from './types'
import { createRouteURLHandler } from './utils'

/**
 * The root route for the smartlist API
 */
const SMARTLIST_ROUTE = '/smart-lists'
/**
 * A helper function to format the URL for smartlist API routes with optional query parameters
 */
const smartListURL = createRouteURLHandler(SMARTLIST_ROUTE)

/**
 * The smartlist API controller, used for interacting with the smartlist endpoints of the Stump API
 */
export class SmartListAPI extends APIBase {
	/**
	 * Fetch all smartlists
	 */
	async get(params?: GetSmartListsParams): Promise<SmartList[]> {
		const { data: smartLists } = await this.axios.get<SmartList[]>(smartListURL('', params))
		return smartLists
	}

	/**
	 * Fetch a smartlist by its ID
	 */
	async getByID(id: string, params?: SmartListRelationOptions): Promise<SmartList> {
		const { data: smartList } = await this.axios.get<SmartList>(smartListURL(id, params))
		return smartList
	}

	/**
	 * Fetch the metadata for a smartlist
	 */
	async meta(id: string): Promise<SmartListMeta> {
		const { data: smartListMeta } = await this.axios.get<SmartListMeta>(smartListURL(`${id}/meta`))
		return smartListMeta
	}

	/**
	 * Fetch items for a smartlist
	 */
	async items(id: string): Promise<SmartListItems> {
		const { data: smartListItems } = await this.axios.get<SmartListItems>(
			smartListURL(`${id}/items`),
		)
		return smartListItems
	}

	/**
	 * Create a smartlist
	 */
	async create(payload: CreateOrUpdateSmartList): Promise<SmartList> {
		const { data: createdSmartList } = await this.axios.post<SmartList>(smartListURL(''), payload)
		return createdSmartList
	}

	/**
	 * Update a smartlist
	 */
	async update(id: string, payload: CreateOrUpdateSmartList): Promise<SmartList> {
		const { data: updatedSmartList } = await this.axios.put<SmartList>(smartListURL(id), payload)
		return updatedSmartList
	}

	/**
	 * Delete a smartlist
	 */
	async delete(id: string): Promise<SmartList> {
		const { data: deletedList } = await this.axios.delete(smartListURL(id))
		return deletedList
	}

	/**
	 * Create a new view for a smartlist
	 */
	async createView(listId: string, payload: CreateOrUpdateSmartListView): Promise<SmartListView> {
		const { data: createdSmartListView } = await this.axios.post<SmartListView>(
			smartListURL(`${listId}/views`),
			payload,
		)
		return createdSmartListView
	}

	/**
	 * Update a view for a smartlist
	 */
	async updateView(
		listId: string,
		viewName: string,
		payload: CreateOrUpdateSmartListView,
	): Promise<SmartListView> {
		const { data: updatedSmartListView } = await this.axios.put<SmartListView>(
			smartListURL(`${listId}/views/${viewName}`),
			payload,
		)
		return updatedSmartListView
	}

	/**
	 * Delete a view for a smartlist
	 */
	async deleteView(listId: string, viewName: string): Promise<void> {
		await this.axios.delete(smartListURL(`${listId}/views/${viewName}`))
	}

	/**
	 * The keys for the smartlist API queries
	 */
	get keys(): ClassQueryKeys<InstanceType<typeof SmartListAPI>> {
		return {
			create: 'smartlist.create',
			createView: 'smartlist.createView',
			delete: 'smartlist.delete',
			deleteView: 'smartlist.deleteView',
			get: 'smartlist.get',
			getByID: 'smartlist.getByID',
			items: 'smartlist.getItems',
			meta: 'smartlist.getMeta',
			update: 'smartlist.update',
			updateView: 'smartlist.updateView',
		}
	}
}
