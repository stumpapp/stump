import type {
	CreateLibraryArgs,
	LibrariesStats,
	Library,
	LibraryScanMode,
	Series,
	UpdateLibraryArgs,
} from '@stump/types'

import { API } from '.'
import { ApiResult, PageableApiResult } from './types'

export function getLibraries(): Promise<PageableApiResult<Library[]>> {
	return API.get('/libraries?unpaged=true')
}

export function getLibrariesStats(): Promise<ApiResult<LibrariesStats>> {
	return API.get('/libraries/stats')
}

export function getLibraryById(id: string): Promise<ApiResult<Library>> {
	return API.get(`/libraries/${id}`)
}

export function getLibrarySeries(
	id: string,
	page: number,
	params?: string,
): Promise<PageableApiResult<Series[]>> {
	if (params) {
		return API.get(`/libraries/${id}/series?page=${page}&${params}`)
	}

	return API.get(`/libraries/${id}/series?page=${page}`)
}

// FIXME: type this lol
// TODO: narrow mode type to exclude NONE
// TODO: fix function signature to work with react-query
export function scanLibary(params: {
	id: string
	mode?: LibraryScanMode
}): Promise<ApiResult<unknown>> {
	return API.get(`/libraries/${params.id}/scan?scan_mode=${params.mode ?? 'BATCHED'}`)
}

// TODO: type this
export function deleteLibrary(id: string) {
	return API.delete(`/libraries/${id}`)
}

export function createLibrary(payload: CreateLibraryArgs): Promise<ApiResult<Library>> {
	return API.post('/libraries', payload)
}

export function editLibrary(payload: UpdateLibraryArgs): Promise<ApiResult<Library>> {
	return API.put(`/libraries/${payload.id}`, payload)
}

const libraryApi = {
	createLibrary,
	deleteLibrary,
	editLibrary,
	getLibraries,
	getLibrariesStats,
	getLibraryById,
	getLibrarySeries,
	scanLibary,
}

export const libraryQueryKeys: Record<keyof typeof libraryApi, string> = {
	createLibrary: 'library.createLibrary',
	deleteLibrary: 'library.deleteLibrary',
	editLibrary: 'library.editLibrary',
	getLibraries: 'library.getLibraries',
	getLibrariesStats: 'library.getLibrariesStats',
	getLibraryById: 'library.getLibraryById',
	getLibrarySeries: 'library.getLibrarySeries',
	scanLibary: 'library.scanLibary',
}
