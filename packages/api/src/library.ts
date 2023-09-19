import type {
	CreateLibrary,
	LibrariesStats,
	Library,
	LibraryScanMode,
	Series,
	UpdateLibrary,
} from '@stump/types'

import { API, mergePageParams, urlWithParams } from '.'
import { ApiResult, PageableApiResult, PagedQueryParams } from './types'

export function getLibraries(): Promise<PageableApiResult<Library[]>> {
	return API.get('/libraries?unpaged=true')
}

export function getLibrariesStats(): Promise<ApiResult<LibrariesStats>> {
	return API.get('/libraries/stats')
}

export function getLibraryById(id: string): Promise<ApiResult<Library>> {
	return API.get(`/libraries/${id}`)
}

export function getLibraryThumbnail(id: string): string {
	return `${API.defaults.baseURL}/libraries/${id}/thumbnail`
}

export function getLibrarySeries(
	id: string,
	{ page, page_size, params }: PagedQueryParams,
): Promise<PageableApiResult<Series[]>> {
	const searchParams = mergePageParams({ page, page_size, params })
	return API.get(urlWithParams(`/libraries/${id}/series`, searchParams))
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

export function deleteLibraryThumbnails(id: string) {
	// TODO: libraries don't have a configurable thumbnail, but eventually
	// they might. So this endpoint might need to change.
	return API.delete(`/libraries/${id}/thumbnail`)
}

export function regenerateThumbnails(id: string, force?: boolean) {
	return API.post(`/libraries/${id}/thumbnail/generate`, { force_regenerate: !!force })
}

export function createLibrary(payload: CreateLibrary): Promise<ApiResult<Library>> {
	return API.post('/libraries', payload)
}

export function editLibrary(payload: UpdateLibrary): Promise<ApiResult<Library>> {
	return API.put(`/libraries/${payload.id}`, payload)
}

export const libraryApi = {
	createLibrary,
	deleteLibrary,
	deleteLibraryThumbnails,
	editLibrary,
	getLibraries,
	getLibrariesStats,
	getLibraryById,
	getLibrarySeries,
	regenerateThumbnails,
	scanLibary,
}

export const libraryQueryKeys: Record<keyof typeof libraryApi, string> = {
	createLibrary: 'library.createLibrary',
	deleteLibrary: 'library.deleteLibrary',
	deleteLibraryThumbnails: 'library.deleteLibraryThumbnails',
	editLibrary: 'library.editLibrary',
	getLibraries: 'library.getLibraries',
	getLibrariesStats: 'library.getLibrariesStats',
	getLibraryById: 'library.getLibraryById',
	getLibrarySeries: 'library.getLibrarySeries',
	regenerateThumbnails: 'library.regenerateThumbnails',
	scanLibary: 'library.scanLibary',
}
