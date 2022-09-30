import type {
	ApiResult,
	CreateLibraryArgs,
	UpdateLibraryArgs,
	LibrariesStats,
	Library,
	PageableApiResult,
	Series,
	LibraryScanMode,
} from '../types';
import { API } from '.';

export function getLibraries(): Promise<PageableApiResult<Library[]>> {
	return API.get('/libraries?unpaged=true');
}

export function getLibrariesStats(): Promise<ApiResult<LibrariesStats>> {
	return API.get('/libraries/stats');
}

export function getLibraryById(id: string): Promise<ApiResult<Library>> {
	return API.get(`/libraries/${id}`);
}

export function getLibrarySeries(
	id: string,
	page: number,
	params?: string,
): Promise<PageableApiResult<Series[]>> {
	if (params) {
		return API.get(`/libraries/${id}/series?page=${page}&${params}`);
	}

	return API.get(`/libraries/${id}/series?page=${page}`);
}

// FIXME: type this lol
// TODO: narrow mode type to exclude NONE
// TODO: fix function signature to work with react-query
export function scanLibary(id: string, mode?: LibraryScanMode): Promise<ApiResult<unknown>> {
	return API.get(`/libraries/${id}/scan?scan_mode=${mode ?? 'BATCHED'}`);
}

// TODO: type this
export function deleteLibrary(id: string) {
	return API.delete(`/libraries/${id}`);
}

export function createLibrary(payload: CreateLibraryArgs): Promise<ApiResult<Library>> {
	return API.post('/libraries', payload);
}

export function editLibrary(payload: UpdateLibraryArgs): Promise<ApiResult<Library>> {
	return API.put(`/libraries/${payload.id}`, payload);
}
