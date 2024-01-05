use std::str::FromStr;

use crate::{
	db::{
		entity::{Media, MediaMetadata, ReadProgress},
		FileStatus,
	},
	prisma::{media, read_progress},
};

media::select!(media_only_series_id { series_id });

media::include!(media_grouped_by_series {
	series: include { metadata }
});

media::include!((progress_filters: Vec<read_progress::WhereParam>) => media_grouped_by_library {
	read_progresses(progress_filters)
	metadata
	series: select { library_id }
});

impl From<media_grouped_by_library::Data> for Media {
	fn from(data: media_grouped_by_library::Data) -> Self {
		let (read_progresses, current_page, is_completed, epubcfi) = {
			let progress = data
				.read_progresses
				.iter()
				.map(|rp| rp.to_owned().into())
				.collect::<Vec<ReadProgress>>();

			// Note: ugh.
			if let Some(p) = progress.first().cloned() {
				(
					Some(progress),
					Some(p.page),
					Some(p.is_completed),
					p.epubcfi,
				)
			} else {
				(Some(progress), None, None, None)
			}
		};

		Media {
			id: data.id,
			name: data.name,
			size: data.size,
			extension: data.extension,
			pages: data.pages,
			updated_at: data.updated_at.to_rfc3339(),
			created_at: data.created_at.to_rfc3339(),
			modified_at: data.modified_at.map(|dt| dt.to_rfc3339()),
			hash: data.hash,
			path: data.path,
			status: FileStatus::from_str(&data.status).unwrap_or(FileStatus::Error),
			series_id: data.series_id.unwrap_or_default(),
			metadata: data.metadata.map(|m| MediaMetadata::from(m.to_owned())),
			read_progresses,
			current_page,
			current_epubcfi: epubcfi,
			is_completed,
			..Default::default()
		}
	}
}
