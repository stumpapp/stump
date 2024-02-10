import { MediaMetadataOverview } from '@stump/types'

import { API } from './axios'
import { APIResult } from './types'
import { toUrlParams, urlWithParams } from './utils'

export function getMediaMetadataOverview(
	params?: Record<string, unknown>,
): Promise<APIResult<MediaMetadataOverview>> {
	return API.get(urlWithParams('/metadata/media', toUrlParams(params)))
}

export function getGenres(): Promise<APIResult<string[]>> {
	return API.get('/metadata/media/genres')
}

export function getWriters(): Promise<APIResult<string[]>> {
	return API.get('/metadata/media/writers')
}

export function getPencillers(): Promise<APIResult<string[]>> {
	return API.get('/metadata/media/pencillers')
}

export function getInkers(): Promise<APIResult<string[]>> {
	return API.get('/metadata/media/inkers')
}

export function getColorists(): Promise<APIResult<string[]>> {
	return API.get('/metadata/media/colorists')
}

export function getLetterers(): Promise<APIResult<string[]>> {
	return API.get('/metadata/media/letterers')
}

export function getEditors(): Promise<APIResult<string[]>> {
	return API.get('/metadata/media/editors')
}

export function getPublishers(): Promise<APIResult<string[]>> {
	return API.get('/metadata/media/publishers')
}

export function getCharacters(): Promise<APIResult<string[]>> {
	return API.get('/metadata/media/characters')
}

export function getTeams(): Promise<APIResult<string[]>> {
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
