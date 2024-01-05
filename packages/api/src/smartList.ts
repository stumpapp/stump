import { GetSmartListsParams, SmartList, SmartListItems, SmartListMeta } from '@stump/types'

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

export async function getSmartListById(id: string): Promise<ApiResult<SmartList>> {
	return API.get(`/smart-lists/${id}`)
}

export async function getSmartListMeta(id: string): Promise<ApiResult<SmartListMeta>> {
	return API.get(`/smart-lists/${id}/meta`)
}

export async function getSmartListItems(id: string): Promise<ApiResult<SmartListItems>> {
	return API.get(`/smart-lists/${id}/items`)
}

// export async function updateSmartList(id: string, payload: SmartList): Promise<ApiResult<SmartList>> {
//   return API.put(`/smart-lists/${id}`, payload)
// }

export async function deleteSmartList(id: string): Promise<ApiResult<SmartList>> {
	return API.delete(`/smart-lists/${id}`)
}

export const smartListApi = {
	createSmartList,
	deleteSmartList,
	getSmartListById,
	getSmartListItems,
	getSmartListMeta,
	getSmartLists,
}

export const smartListQueryKeys: Record<keyof typeof smartListApi, string> = {
	createSmartList: 'smartlist.create',
	deleteSmartList: 'smartlist.delete',
	getSmartListById: 'smartlist.getById',
	getSmartListItems: 'smartlist.getItems',
	getSmartListMeta: 'smartlist.getMeta',
	getSmartLists: 'smartlist.get',
}
