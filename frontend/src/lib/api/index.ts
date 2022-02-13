import { scanLibrary } from './library';
import { getSeries, getSeriesThumbnail } from './series';
import { getMediaById, getMediaThumbnail } from './media';

export const baseUrl = process.env.NODE_ENV === 'production' ? '' : 'http://localhost:6969';

export default {
	library: {
		scanLibrary
	},
	series: {
		getSeries,
		getSeriesThumbnail
	},
	media: {
		getMediaById,
		getMediaThumbnail
	}
};
