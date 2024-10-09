use std::str::FromStr;

use crate::{
	db::{
		entity::{ActiveReadingSession, FinishedReadingSession, Media, MediaMetadata},
		FileStatus,
	},
	prisma::{active_reading_session, finished_reading_session, media},
};

media::select!(media_only_series_id { series_id });

media::include!(media_grouped_by_series {
	series: include { metadata }
});

media::include!((user_id: String) => media_grouped_by_library {
	active_user_reading_sessions(vec![active_reading_session::user_id::equals(user_id.clone())])
	finished_user_reading_sessions(vec![finished_reading_session::user_id::equals(user_id.clone())])
	metadata
	series: select { library_id }
});

impl From<media_grouped_by_library::Data> for Media {
	fn from(data: media_grouped_by_library::Data) -> Self {
		let active_reading_session = data
			.active_user_reading_sessions
			.first()
			.cloned()
			.map(ActiveReadingSession::from);
		let (current_page, current_epubcfi) = active_reading_session
			.as_ref()
			.map_or((None, None), |session| {
				(session.page, session.epubcfi.clone())
			});

		let finished_reading_sessions = data
			.finished_user_reading_sessions
			.iter()
			.map(|data| FinishedReadingSession::from(data.to_owned()))
			.collect::<Vec<FinishedReadingSession>>();
		let is_completed = !finished_reading_sessions.is_empty();

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
			metadata: data.metadata.map(|m| MediaMetadata::from(m.clone())),
			active_reading_session,
			finished_reading_sessions: Some(finished_reading_sessions),
			current_page,
			current_epubcfi,
			is_completed: Some(is_completed),
			..Default::default()
		}
	}
}
