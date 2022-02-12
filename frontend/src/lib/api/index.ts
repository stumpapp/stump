import { scanLibrary } from './library';

export const baseUrl = process.env.NODE_ENV === 'production' ? '' : 'http://localhost:6969';

export default {
	library: {
		scanLibrary
	}
};
