use models::{
	entity::{
		finished_reading_session, media, media_metadata, reading_session, user::AuthUser,
	},
	prefixer::{parse_query_to_model, parse_query_to_model_optional},
};
use sea_orm::{
	prelude::*, sea_query::IntoCondition, FromQueryResult, JoinType, QuerySelect, Select,
};

use crate::kobo::sync_types::*;
use chrono::Utc;

#[derive(Debug, Clone, FromQueryResult)]
pub struct ReadingSession {
	pub started_at: DateTimeWithTimeZone,
	pub updated_at: Option<DateTimeWithTimeZone>,
	pub percentage_completed: Option<Decimal>,
}

#[derive(Debug, Clone)]
pub struct MediaWithMetadataAndReadingSessions {
	pub media: media::Model,
	pub metadata: Option<media_metadata::Model>,
	pub reading_session: Option<ReadingSession>,
	pub finished_reading_session_count: u32,
	pub finished_reading_session_last_completed_at: Option<DateTimeWithTimeZone>,
}

fn apply_reading_session_joins(
	query: Select<media::Entity>,
	user: &AuthUser,
) -> Select<media::Entity> {
	// it would be nice to use `.select_also` here instead of manually selecting columns, but
	// that doesn't work with `.into_model`.
	//
	// we're using a custom `ReadingSession` struct to insulate us from changes to
	// `reading_session`: if the entity requires columns that aren't selected here, then
	// `parse_query_to_model_optional` will silently return None.
	query
		.column_as(reading_session::Column::Id, "reading_sessionsid")
		.column_as(
			reading_session::Column::StartedAt,
			"reading_sessionsstarted_at",
		)
		.column_as(
			reading_session::Column::UpdatedAt,
			"reading_sessionsupdated_at",
		)
		.column_as(
			reading_session::Column::PercentageCompleted,
			"reading_sessionspercentage_completed",
		)
		// LEFT JOIN reading_sessions on media.id = reading_sessions.media_id
		//  AND reading_sessions.user_id = $user_id
		.join(
			JoinType::LeftJoin,
			media::Relation::ReadingSession.def().on_condition({
				let user_id = user.id.clone();
				move |_left, right| {
					Expr::col((right, reading_session::Column::UserId))
						.eq(user_id.clone())
						.into_condition()
				}
			}),
		)
		.column_as(
			finished_reading_session::Column::Id.count(),
			"finished_reading_session_count",
		)
		.column_as(
			finished_reading_session::Column::CompletedAt.max(),
			"finished_reading_session_last_completed_at",
		)
		// LEFT JOIN finished_reading_sessions on media.id = finished_reading_sessions.media_id
		//  AND finished_reading_sessions.user_id = $user_id
		.join(
			JoinType::LeftJoin,
			media::Relation::FinishedReadingSession.def().on_condition({
				let user_id = user.id.clone();
				move |_left, right| {
					Expr::col((right, finished_reading_session::Column::UserId))
						.eq(user_id.clone())
						.into_condition()
				}
			}),
		)
		// we need this to avoid having one result row per finished reading session.
		// i'm skeptical that this will work with non-sqlite backends!
		.group_by(media::Column::Id)
}

impl MediaWithMetadataAndReadingSessions {
	pub fn find_by_id_for_user(id: String, user: &AuthUser) -> Select<media::Entity> {
		let select = media::ModelWithMetadata::find_by_id_for_user(id, user);
		apply_reading_session_joins(select, user)
	}

	// TODO: should this take a more generic type?
	pub fn find_by_ids_for_user(
		ids: &Vec<String>,
		user: &AuthUser,
	) -> Select<media::Entity> {
		let select = media::ModelWithMetadata::find_for_user(user)
			.filter(media::Column::Id.is_in(ids));
		apply_reading_session_joins(select, user)
	}
}

impl FromQueryResult for MediaWithMetadataAndReadingSessions {
	fn from_query_result(
		res: &sea_orm::QueryResult,
		_pre: &str,
	) -> Result<Self, sea_orm::DbErr> {
		let media = parse_query_to_model::<media::Model, media::Entity>(res)?;
		let metadata = parse_query_to_model_optional::<
			media_metadata::Model,
			media_metadata::Entity,
		>(res)?;
		let reading_session = parse_query_to_model_optional::<
			ReadingSession,
			reading_session::Entity,
		>(res)?;
		Ok(Self {
			media,
			metadata,
			reading_session,
			finished_reading_session_count: res
				.try_get("", "finished_reading_session_count")?,
			finished_reading_session_last_completed_at: res
				.try_get("", "finished_reading_session_last_completed_at")?,
		})
	}
}

// a UUID that we can use when we don't have an ID that is more appropriate.
const DUMMY_UUID: &str = "00000000-0000-0000-0000-000000000001";

impl BookMetadata {
	pub fn from_media(m: &MediaWithMetadataAndReadingSessions, book_url: String) -> Self {
		let media_id = &m.media.id;

		let writers = m.metadata.as_ref().and_then(|mm| mm.writers.clone());

		BookMetadata {
			categories: vec![DUMMY_UUID.to_string()],
			contributor_roles: writers
				.clone()
				.into_iter()
				.map(|w| ContributorRole { name: w })
				.collect(),
			contributors: writers.clone().into_iter().collect(),
			cover_image_id: media_id.clone(),
			cross_revision_id: media_id.clone(),
			current_display_price: DisplayPrice {
				currency_code: "USD".to_string(),
				total_amount: 0,
			},
			current_love_display_price: LoveDisplayPrice { total_amount: 0 },
			description: m.metadata.clone().and_then(|mm| mm.summary),
			download_urls: vec![DownloadUrl {
				drm_type: "None".to_string(),
				// this seems to be unrelated to the EPUB 3 spec.
				// the Kobo ignores books with format: "EPUB".
				format: Format::EPUB3,
				size: u64::try_from(m.media.size).unwrap_or(0),
				platform: "Generic".to_string(),
				url: book_url,
			}],
			entitlement_id: media_id.clone(),
			external_ids: vec![],
			genre: DUMMY_UUID.to_string(),
			is_eligible_for_kobo_love: false,
			is_internet_archive: false,
			is_pre_order: false,
			is_social_enabled: true,
			isbn: m.metadata.clone().and_then(|mm| mm.identifier_isbn),
			language: "en".to_string(),
			phonetic_pronunciations: Empty {},
			publication_date: None, // TODO
			publisher: m.metadata.clone().and_then(|mm| mm.publisher).map(|mp| {
				Publisher {
					imprint: "".to_string(),
					name: mp,
				}
			}),
			revision_id: media_id.clone(),
			series: None, // TODO
			title: m
				.metadata
				.as_ref()
				.and_then(|mm| mm.title.clone())
				.unwrap_or(m.media.name.clone()),
			work_id: media_id.clone(),
		}
	}
}

impl ReadingState {
	fn unread(media_id: String) -> Self {
		ReadingState {
			created: Utc::now(),
			current_bookmark: CurrentBookmark {
				last_modified: Utc::now(),
				progress_percent: None,
				content_source_progress_percent: None,
				location: None,
			},
			entitlement_id: media_id,
			last_modified: Utc::now(),
			priority_timestamp: Utc::now(),
			statistics: Statistics {
				last_modified: Utc::now(),
			},
			status_info: StatusInfo {
				last_modified: Utc::now(),
				status: Status::ReadyToRead,
				times_started_reading: 0,
			},
		}
	}

	fn finished(media_id: String) -> Self {
		ReadingState {
			created: Utc::now(),
			current_bookmark: CurrentBookmark {
				last_modified: Utc::now(),
				progress_percent: None,
				content_source_progress_percent: None,
				location: None,
			},
			entitlement_id: media_id,
			last_modified: Utc::now(),
			priority_timestamp: Utc::now(),
			statistics: Statistics {
				last_modified: Utc::now(),
			},
			status_info: StatusInfo {
				last_modified: Utc::now(),
				status: Status::Finished,
				times_started_reading: 1,
			},
		}
	}

	pub fn from_active_reading_session(media_id: String, rs: &ReadingSession) -> Self {
		ReadingState {
			created: rs.started_at.to_utc(), // TODO
			current_bookmark: CurrentBookmark {
				last_modified: rs.updated_at.unwrap_or(rs.started_at).to_utc(), // TODO
				progress_percent: rs
					.percentage_completed
					.and_then(|pc| f32::try_from(pc).ok().map(|pc| pc * 100.0)), // TODO horrible
				content_source_progress_percent: rs
					.percentage_completed
					.and_then(|pc| f32::try_from(pc).ok().map(|pc| pc * 100.0)), // TODO horrible
				location: None,                                                 // TODO kobo span
			},
			entitlement_id: media_id,
			last_modified: rs.updated_at.unwrap_or(rs.started_at).to_utc(), // TODO
			priority_timestamp: rs.updated_at.unwrap_or(rs.started_at).to_utc(), // TODO
			statistics: Statistics {
				last_modified: rs.updated_at.unwrap_or(rs.started_at).to_utc(), // TODO
			},
			status_info: StatusInfo {
				last_modified: rs.updated_at.unwrap_or(rs.started_at).to_utc(), // TODO
				status: Status::Reading,
				times_started_reading: 1, // TODO we could actually track this
			},
		}
	}
}

impl BookEntitlementContainer {
	pub fn from_media(m: MediaWithMetadataAndReadingSessions, book_url: String) -> Self {
		let media_id = &m.media.id;

		let reading_state = match (
			m.reading_session.as_ref(),
			m.finished_reading_session_last_completed_at,
		) {
			(Some(active_reading_session), _) => {
				ReadingState::from_active_reading_session(
					media_id.to_string(),
					active_reading_session,
				)
			},
			(_, Some(_)) => ReadingState::finished(media_id.to_string()),
			(_, _) => ReadingState::unread(media_id.to_string()),
		};

		BookEntitlementContainer {
			book_entitlement: BookEntitlement {
				accessibility: "Full".to_string(),
				active_period: Period { from: Utc::now() },
				created: m.media.created_at.to_utc(),
				cross_revision_id: media_id.clone(),
				id: media_id.clone(),
				is_hidden_from_archive: false,
				is_locked: false,
				is_removed: false,
				last_modified: m
					.media
					.modified_at
					.map(|t| t.to_utc())
					.unwrap_or(Utc::now()),
				origin_category: "Imported".to_string(),
				revision_id: media_id.clone(),
				status: "Active".to_string(),
			},
			book_metadata: BookMetadata::from_media(&m, book_url),
			reading_state: Some(reading_state),
		}
	}
}

#[cfg(test)]
mod tests {
	use models::entity::user;
	use sea_orm::DbConn;
	use tests::db::test_database;
	use tests::fake_data;

	use crate::kobo::entity::MediaWithMetadataAndReadingSessions;
	use crate::kobo::sync_types::{BookEntitlementContainer, Status};

	async fn load_media(
		db: &DbConn,
		user: &user::AuthUser,
		id: String,
	) -> MediaWithMetadataAndReadingSessions {
		MediaWithMetadataAndReadingSessions::find_by_id_for_user(id, user)
			.into_model::<MediaWithMetadataAndReadingSessions>()
			.one(db)
			.await
			.expect("book not found")
			.unwrap()
	}

	#[tokio::test]
	async fn test_reading_state_unread() {
		let db = test_database().await;

		let user = fake_data::User::default().insert(&db).await;
		let user = user::AuthUser {
			id: user.id,
			permissions: vec![],
			..Default::default()
		};

		let series = fake_data::Series::default().insert(&db).await;
		let media = fake_data::Media {
			series_id: series.id.clone(),
			id: Some("don-quixote".to_string()),
			name: Some("Don Quixote".to_string()),
			created_at: Some("1605-01-16T00:00:00Z".parse().unwrap()),
			..Default::default()
		}
		.insert(&db)
		.await;

		// this book has no reading sessions.

		let m = load_media(&db, &user, media.id).await;

		let entitlement =
			BookEntitlementContainer::from_media(m, "https://example.org/".to_string());

		// this is an unread book.
		let reading_state = entitlement.reading_state.unwrap();
		assert_eq!(Status::ReadyToRead, reading_state.status_info.status);

		let bookmark = reading_state.current_bookmark;
		assert_eq!(None, bookmark.progress_percent);
		assert_eq!(None, bookmark.content_source_progress_percent);
		assert_eq!(None, bookmark.location);
	}

	#[tokio::test]
	async fn test_reading_state_currently_reading() {
		let db = test_database().await;

		let user = fake_data::User::default().insert(&db).await;
		let user = user::AuthUser {
			id: user.id,
			permissions: vec![],
			..Default::default()
		};

		let series = fake_data::Series::default().insert(&db).await;
		let media = fake_data::Media {
			series_id: series.id.clone(),
			id: Some("don-quixote".to_string()),
			name: Some("Don Quixote".to_string()),
			created_at: Some("1605-01-16T00:00:00Z".parse().unwrap()),
			..Default::default()
		}
		.insert(&db)
		.await;

		// this book has a single active reading session

		fake_data::ReadingSession {
			media_id: media.id.clone(),
			user_id: user.id.clone(),
			percentage_completed: 0.5,
		}
		.insert(&db)
		.await;

		let m = load_media(&db, &user, media.id).await;

		let entitlement =
			BookEntitlementContainer::from_media(m, "https://example.org/".to_string());

		// we're partway through this book.
		let reading_state = entitlement.reading_state.unwrap();
		assert_eq!(Status::Reading, reading_state.status_info.status);

		let bookmark = reading_state.current_bookmark;
		assert_eq!(Some(50.0), bookmark.progress_percent);
		assert_eq!(Some(50.0), bookmark.content_source_progress_percent);
		assert_eq!(None, bookmark.location);
	}

	#[tokio::test]
	async fn test_reading_state_finished() {
		let db = test_database().await;

		let user = fake_data::User::default().insert(&db).await;
		let user = user::AuthUser {
			id: user.id,
			permissions: vec![],
			..Default::default()
		};

		let series = fake_data::Series::default().insert(&db).await;
		let media = fake_data::Media {
			series_id: series.id.clone(),
			id: Some("don-quixote".to_string()),
			name: Some("Don Quixote".to_string()),
			created_at: Some("1605-01-16T00:00:00Z".parse().unwrap()),
			..Default::default()
		}
		.insert(&db)
		.await;

		// this book has a single finished reading session

		fake_data::FinishedReadingSession {
			media_id: media.id.clone(),
			user_id: user.id.clone(),
		}
		.insert(&db)
		.await;

		let m = load_media(&db, &user, media.id).await;

		let entitlement =
			BookEntitlementContainer::from_media(m, "https://example.org/".to_string());

		// we finished this book.
		let reading_state = entitlement.reading_state.unwrap();
		assert_eq!(Status::Finished, reading_state.status_info.status);

		let bookmark = reading_state.current_bookmark;
		assert_eq!(None, bookmark.progress_percent);
		assert_eq!(None, bookmark.content_source_progress_percent);
		assert_eq!(None, bookmark.location);
	}
}
