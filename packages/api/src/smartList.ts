import {
	CreateOrUpdateSmartList,
	CreateOrUpdateSmartListView,
	GetSmartListsParams,
	SmartList,
	SmartListItems,
	SmartListMeta,
	SmartListRelationOptions,
	SmartListView,
} from '@stump/types'

import { API } from './axios'
import { ApiResult } from './types'
import { toUrlParams, urlWithParams } from './utils'

export async function getSmartLists(params?: GetSmartListsParams): Promise<ApiResult<SmartList[]>> {
	if (params) {
		const searchParams = toUrlParams(params)
		return API.get(urlWithParams('/smart-lists', searchParams))
	}

	return API.get('/smart-lists')
}

export async function createSmartList(payload: SmartList): Promise<ApiResult<SmartList>> {
	return API.post('/smart-lists', payload)
}

export async function getSmartListById(
	id: string,
	params?: SmartListRelationOptions,
): Promise<ApiResult<SmartList>> {
	if (params) {
		const searchParams = toUrlParams(params)
		return API.get(urlWithParams(`/smart-lists/${id}`, searchParams))
	} else {
		return API.get(`/smart-lists/${id}`)
	}
}

export async function getSmartListMeta(id: string): Promise<ApiResult<SmartListMeta>> {
	return API.get(`/smart-lists/${id}/meta`)
}

export async function getSmartListItems(id: string): Promise<ApiResult<SmartListItems>> {
	return API.get(`/smart-lists/${id}/items`)
}

// TODO: different types!
export async function updateSmartList(
	id: string,
	payload: CreateOrUpdateSmartList,
): Promise<ApiResult<SmartList>> {
	return API.put(`/smart-lists/${id}`, payload)
}

export async function deleteSmartList(id: string): Promise<ApiResult<SmartList>> {
	return API.delete(`/smart-lists/${id}`)
}

export async function createSmartListView(
	listId: string,
	params: CreateOrUpdateSmartListView,
): Promise<ApiResult<SmartListView>> {
	return API.post(`/smart-lists/${listId}/views`, params)
}

export async function updateSmartListView(
	listId: string,
	name: string,
	params: CreateOrUpdateSmartListView,
): Promise<ApiResult<SmartListView>> {
	return API.put(`/smart-lists/${listId}/views/${name}`, params)
}

export const smartListApi = {
	createSmartList,
	createSmartListView,
	deleteSmartList,
	getSmartListById,
	getSmartListItems,
	getSmartListMeta,
	getSmartLists,
	updateSmartList,
	updateSmartListView,
}

export const smartListQueryKeys: Record<keyof typeof smartListApi, string> = {
	createSmartList: 'smartlist.create',
	createSmartListView: 'smartlist.createView',
	deleteSmartList: 'smartlist.delete',
	getSmartListById: 'smartlist.getById',
	getSmartListItems: 'smartlist.getItems',
	getSmartListMeta: 'smartlist.getMeta',
	getSmartLists: 'smartlist.get',
	updateSmartList: 'smartlist.update',
	updateSmartListView: 'smartlist.updateView',
}
