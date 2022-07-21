import {
	ApiResult,
	CreateLibraryInput,
	EditLibraryInput,
	LibrariesStats,
	Library,
	PageableApiResult,
	Series,
} from '@stump/core';
import API from '.';

export function getLibraries(): Promise<PageableApiResult<Library[]>> {
	return API.get('/libraries?unpaged=true');
}

export function getLibrariesStats(): Promise<ApiResult<LibrariesStats>> {
	return API.get('/libraries/stats');
}

export function getLibraryById(id: string): Promise<ApiResult<Library>> {
	return API.get(`/libraries/${id}`);
}

export function getLibrarySeries(id: string, page: number): Promise<PageableApiResult<Series[]>> {
	return API.get(`/libraries/${id}/series?page=${page}`);
}

// TODO: type this
export function scanLibary(id: string): Promise<unknown> {
	return API.get(`/libraries/${id}/scan`);
}

// TODO: type this
export function deleteLibrary(id: string) {
	return API.delete(`/libraries/${id}`);
}

export function createLibrary(payload: CreateLibraryInput): Promise<ApiResult<Library>> {
	return API.post('/libraries', payload);
}

export function editLibrary(payload: EditLibraryInput): Promise<ApiResult<Library>> {
	return API.put(`/libraries/${payload.id}`, payload);
}
