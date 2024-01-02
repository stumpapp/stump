import type {
	CleanLibraryResponse,
	CreateLibrary,
	LibrariesStats,
	Library,
	LibraryScanMode,
	PatchLibraryThumbnail,
	Series,
	UpdateLibrary,
} from '@stump/types'

import { API } from './axios'
import { ApiResult, PageableApiResult, PagedQueryParams } from './types'
import { mergePageParams, toUrlParams, urlWithParams } from './utils'

export function getLibraries(
	params: Record<string, unknown> = { unpaged: true },
): Promise<PageableApiResult<Library[]>> {
	return API.get(urlWithParams('/libraries', toUrlParams(params)))
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

export function cleanLibrary(id: string): Promise<ApiResult<CleanLibraryResponse>> {
	return API.put(`/libraries/${id}/clean`)
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

export function patchLibraryThumbnail(id: string, params: PatchLibraryThumbnail) {
	return API.patch(`/libraries/${id}/thumbnail`, params)
}

export function visitLibrary(id: string) {
	return API.put(`/libraries/last-visited/${id}`)
}

export function getLastVisitedLibrary(): Promise<ApiResult<Library>> {
	return API.get('/libraries/last-visited')
}

export const libraryApi = {
	cleanLibrary,
	createLibrary,
	deleteLibrary,
	deleteLibraryThumbnails,
	editLibrary,
	getLastVisitedLibrary,
	getLibraries,
	getLibrariesStats,
	getLibraryById,
	getLibrarySeries,
	patchLibraryThumbnail,
	regenerateThumbnails,
	scanLibary,
	visitLibrary,
}

export const libraryQueryKeys: Record<keyof typeof libraryApi, string> = {
	cleanLibrary: 'library.cleanLibrary',
	createLibrary: 'library.createLibrary',
	deleteLibrary: 'library.deleteLibrary',
	deleteLibraryThumbnails: 'library.deleteLibraryThumbnails',
	editLibrary: 'library.editLibrary',
	getLastVisitedLibrary: 'library.getLastVisitedLibrary',
	getLibraries: 'library.getLibraries',
	getLibrariesStats: 'library.getLibrariesStats',
	getLibraryById: 'library.getLibraryById',
	getLibrarySeries: 'library.getLibrarySeries',
	patchLibraryThumbnail: 'library.patchLibraryThumbnail',
	regenerateThumbnails: 'library.regenerateThumbnails',
	scanLibary: 'library.scanLibary',
	visitLibrary: 'library.visitLibrary',
}
