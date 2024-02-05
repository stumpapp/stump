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
import { APIResult, PageableAPIResult, PagedQueryParams } from './types'
import { mergePageParams, toUrlParams, urlWithParams } from './utils'

export function getLibraries(
	params: Record<string, unknown> = { unpaged: true },
): Promise<PageableAPIResult<Library[]>> {
	return API.get(urlWithParams('/libraries', toUrlParams(params)))
}

export function getLibrariesStats(): Promise<APIResult<LibrariesStats>> {
	return API.get('/libraries/stats')
}

export function getLibraryById(id: string): Promise<APIResult<Library>> {
	return API.get(`/libraries/${id}`)
}

export function getLibraryThumbnail(id: string): string {
	return `${API.defaults.baseURL}/libraries/${id}/thumbnail`
}

export function getLibrarySeries(
	id: string,
	{ page, page_size, params }: PagedQueryParams,
): Promise<PageableAPIResult<Series[]>> {
	const searchParams = mergePageParams({ page, page_size, params })
	return API.get(urlWithParams(`/libraries/${id}/series`, searchParams))
}

// FIXME: type this lol
// TODO: narrow mode type to exclude NONE
// TODO: fix function signature to work with react-query
export function scanLibary(params: {
	id: string
	mode?: LibraryScanMode
}): Promise<APIResult<unknown>> {
	return API.get(`/libraries/${params.id}/scan?scan_mode=${params.mode ?? 'BATCHED'}`)
}

export function cleanLibrary(id: string): Promise<APIResult<CleanLibraryResponse>> {
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

export function createLibrary(payload: CreateLibrary): Promise<APIResult<Library>> {
	return API.post('/libraries', payload)
}

export function editLibrary(payload: UpdateLibrary): Promise<APIResult<Library>> {
	return API.put(`/libraries/${payload.id}`, payload)
}

export function patchLibraryThumbnail(id: string, params: PatchLibraryThumbnail) {
	return API.patch(`/libraries/${id}/thumbnail`, params)
}

export function uploadLibraryThumbnail(id: string, file: File) {
	const formData = new FormData()
	formData.append('file', file)
	return API.post(`/libraries/${id}/thumbnail`, formData, {
		headers: {
			'Content-Type': 'multipart/form-data',
		},
	})
}

export function visitLibrary(id: string) {
	return API.put(`/libraries/last-visited/${id}`)
}

export function getLastVisitedLibrary(): Promise<APIResult<Library>> {
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
	uploadLibraryThumbnail,
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
	uploadLibraryThumbnail: 'library.uploadLibraryThumbnail',
	visitLibrary: 'library.visitLibrary',
}
