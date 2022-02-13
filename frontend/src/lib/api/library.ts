import { baseUrl } from '.';

// TODO: type this?
export function scanLibrary(libraryId: number) {
	return fetch(`${baseUrl}/api/library/${libraryId}/scan`)
		.then((res) => res.json())
		.catch((err) => {
			throw new Error(err);
		});
}

// TODO: type this?
async function deleteLibrary(libraryId: number) {
	return fetch(`${baseUrl}/api/library/${libraryId}`, {
		method: 'DELETE'
	})
		.then((res) => res.json())
		.catch((err) => {
			throw new Error(err);
		});
}
