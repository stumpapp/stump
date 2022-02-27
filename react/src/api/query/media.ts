import API from '..';

export function getMedia(): Promise<GetMediaResponse> {
	return API.get('/media');
}
