enum MediaStatus {
	Unknown = 'UNKNOWN',
	Error = 'ERROR',
	Ready = 'READY',
	Unsupported = 'UNSUPPORTED',
}

interface Media {
	/**
	 * The id of the media.
	 */
	id: number;
	/**
	 * The id of the series which this media belongs to.
	 */
	series_id: number;
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
	// FIXME: let's see if this will work
	/**
	 * The date/time the media was last modified. Extracted from metadata.
	 */
	updated_at?: Date;
	// TODO: this should be removed...
	downloaded: boolean;
	/**
	 * The checksum of the media file.
	 */
	checksum: string;
	/**
	 * The path of the media file on disk.
	 */
	path: string;
}

interface MediaWithProgress extends Media {
	/**
	 * The page the viewing user is currently on for the associated media.
	 */
	current_page?: number;
}

// interface MediaWithSeries extends MediaWithProgress {
//     series_name: string;
// }
