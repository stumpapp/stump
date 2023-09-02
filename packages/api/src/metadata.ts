import { MediaMetadataOverview } from '@stump/types'

import { API, toUrlParams } from './index'
import { ApiResult } from './types'

export function getMediaMetadataOverview(
	params?: Record<string, unknown>,
): Promise<ApiResult<MediaMetadataOverview>> {
	const qs = toUrlParams(params)
	return API.get(`/metadata/media?${qs.toString()}`)
}

export function getGenres(): Promise<ApiResult<string[]>> {
	return API.get('/metadata/media/genres')
}

export function getWriters(): Promise<ApiResult<string[]>> {
	return API.get('/metadata/media/writers')
}

export function getPencillers(): Promise<ApiResult<string[]>> {
	return API.get('/metadata/media/pencillers')
}

export function getInkers(): Promise<ApiResult<string[]>> {
	return API.get('/metadata/media/inkers')
}

export function getColorists(): Promise<ApiResult<string[]>> {
	return API.get('/metadata/media/colorists')
}

export function getLetterers(): Promise<ApiResult<string[]>> {
	return API.get('/metadata/media/letterers')
}

export function getEditors(): Promise<ApiResult<string[]>> {
	return API.get('/metadata/media/editors')
}

export function getPublishers(): Promise<ApiResult<string[]>> {
	return API.get('/metadata/media/publishers')
}

export function getCharacters(): Promise<ApiResult<string[]>> {
	return API.get('/metadata/media/characters')
}

export function getTeams(): Promise<ApiResult<string[]>> {
	return API.get('/metadata/media/teams')
}

export const metadataApi = {
	getCharacters,
	getColorists,
	getEditors,
	getGenres,
	getInkers,
	getLetterers,
	getMediaMetadataOverview,
	getPencillers,
	getPublishers,
	getTeams,
	getWriters,
}

export const metadataQueryKeys: Record<keyof typeof metadataApi, string> = {
	getCharacters: 'metadata.getCharacters',
	getColorists: 'metadata.getColorists',
	getEditors: 'metadata.getEditors',
	getGenres: 'metadata.getGenres',
	getInkers: 'metadata.getInkers',
	getLetterers: 'metadata.getLetterers',
	getMediaMetadataOverview: 'metadata.getMediaMetadataOverview',
	getPencillers: 'metadata.getPencillers',
	getPublishers: 'metadata.getPublishers',
	getTeams: 'metadata.getTeams',
	getWriters: 'metadata.getWriters',
}
