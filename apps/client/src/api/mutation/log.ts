import API from '..';

export function clearLogFile() {
	return API.delete('/logs');
}
