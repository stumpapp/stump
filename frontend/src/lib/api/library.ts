import { baseUrl } from '.';

// TODO: type this?
export function scanLibrary(libraryId: number) {
	return fetch(`${baseUrl}/api/library/${libraryId}/scan`)
		.then((res) => res.json())
		.then((res) => {
			if (res.error) {
				throw new Error(res.error);
			}
			return res;
		});
}

// TODO: type this?
async function deleteLibrary(libraryId: number) {
	return fetch(`${baseUrl}/api/library/${libraryId}`, {
		method: 'DELETE'
	})
		.then((res) => res.json())
		.then((res) => {
			if (res.error) {
				throw new Error(res.error);
			}
			return res;
		});
}
