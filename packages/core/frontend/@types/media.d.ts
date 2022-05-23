declare enum MediaStatus {
	Unknown = 'UNKNOWN',
	Error = 'ERROR',
	Ready = 'READY',
	Unsupported = 'UNSUPPORTED',
}

interface Media {
	/**
	 * The id of the media.
	 */
	id: string;
	/**
	 * The id of the series which this media belongs to.
	 */
	seriesId: string;
	/**
	 * The common name of the media. Either the name extracted from metadata or the file name.
	 */
	name: string;
	/**
	 * The description extracted from metadata.
	 */
	description?: string;
	/**
	 * The size of the media in bytes.
	 */
	size: number;
	/**
	 * The extension of the media file.
	 */
	extension: string;
	/**
	 * The number of (image) pages in the media.
	 */
	pages: number;
	/**
	 * The date/time the media was last modified. Extracted from metadata.
	 */
	updatedAt?: Date;
	/**
	 * The checksum of the media file.
	 */
	checksum: string;
	/**
	 * The path of the media file on disk.
	 */
	path: string;
	/**
	 * The user assigned tags for this media.
	 * @see Tag
	 */
	tags: Tag[];
}

interface MediaWithProgress extends Media {
	/**
	 * The page the viewing user is currently on for the associated media.
	 */
	currentPage?: number;
}

// interface MediaWithSeries extends MediaWithProgress {
//     series_name: string;
// }

type GetMediaResponse = ApiResult<MediaWithProgress[]>;
type GetMediaById = ApiResult<MediaWithProgress>;
