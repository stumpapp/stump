import { baseUrl } from '.';

export function getLibraries() {
	return fetch(`${baseUrl}/api/library`, { credentials: 'include' });
}

// TODO: type this?
export function scanLibrary(libraryId: number) {
	return fetch(`${baseUrl}/api/library/${libraryId}/scan`);
}

// TODO: type this?
async function deleteLibrary(libraryId: number) {
	return fetch(`${baseUrl}/api/library/${libraryId}`, {
		method: 'DELETE',
	});
}
