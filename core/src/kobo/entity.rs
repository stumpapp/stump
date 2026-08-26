use models::{
	entity::{
		media, media_metadata, reading_progress_reset, reading_session, user::AuthUser,
	},
	prefixer::{parse_query_to_model, parse_query_to_model_optional},
	shared::{enums::ReadingStatus, readium::ReadiumLocator},
};
use rust_decimal::prelude::ToPrimitive;
use sea_orm::{
	prelude::*,
	sea_query::{Condition, Expr, Order, Query, SimpleExpr, SubQueryStatement},
	FromQueryResult, JoinType, QuerySelect, Select,
};

use crate::kobo::{position::KoboPositionMap, sync_types::*};
use chrono::Utc;

#[derive(Debug, Clone, FromQueryResult)]
pub struct ReadingSession {
	pub created_at: DateTimeWithTimeZone,
	pub updated_at: Option<DateTimeWithTimeZone>,
	pub reported_at: Option<DateTimeWithTimeZone>,
	pub end_percentage: Option<Decimal>,
	pub end_locator: Option<ReadiumLocator>,
	pub status: ReadingStatus,
}

#[derive(Debug, Clone)]
pub struct MediaWithMetadataAndReadingSessions {
	pub media: media::Model,
	pub metadata: Option<media_metadata::Model>,
	pub reading_session: Option<ReadingSession>,
	pub reading_progress_reset_at: Option<DateTimeWithTimeZone>,
	pub reading_progress_reset_reported_at: Option<DateTimeWithTimeZone>,
	pub finished_reading_session_count: u32,
	pub finished_reading_session_last_completed_at: Option<DateTimeWithTimeZone>,
	pub finished_reading_session_last_reported_at: Option<DateTimeWithTimeZone>,
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
	let user_id = user.id.clone();

	// IN (select max(created_at) where user_id=user.id AND media_id=media.id
	let latest_subq = Query::select()
		.expr(
			Expr::col((reading_session::Entity, reading_session::Column::CreatedAt))
				.max(),
		)
		.from(reading_session::Entity)
		.and_where(reading_session::Column::UserId.eq(user_id.clone()))
		// where media_id = media.id
		.and_where(
			Expr::col((reading_session::Entity, reading_session::Column::MediaId))
				.equals((media::Entity, media::Column::Id)),
		)
		.to_owned();

	let completed_count_subq = Query::select()
		.expr(Expr::col((reading_session::Entity, reading_session::Column::Id)).count())
		.from(reading_session::Entity)
		.and_where(reading_session::Column::UserId.eq(user_id.clone()))
		.and_where(
			Expr::col((reading_session::Entity, reading_session::Column::MediaId))
				.equals((media::Entity, media::Column::Id)),
		)
		.and_where(reading_session::Column::Status.eq(ReadingStatus::Finished))
		.to_owned();

	let last_completed_subq = Query::select()
		.expr(
			Expr::col((reading_session::Entity, reading_session::Column::UpdatedAt))
				.max(),
		)
		.from(reading_session::Entity)
		.and_where(reading_session::Column::UserId.eq(user_id.clone()))
		.and_where(
			Expr::col((reading_session::Entity, reading_session::Column::MediaId))
				.equals((media::Entity, media::Column::Id)),
		)
		.and_where(reading_session::Column::Status.eq(ReadingStatus::Finished))
		.to_owned();
	let last_completed_reported_at_subq = Query::select()
		.column(reading_session::Column::ReportedAt)
		.from(reading_session::Entity)
		.and_where(reading_session::Column::UserId.eq(user_id.clone()))
		.and_where(
			Expr::col((reading_session::Entity, reading_session::Column::MediaId))
				.equals((media::Entity, media::Column::Id)),
		)
		.and_where(reading_session::Column::Status.eq(ReadingStatus::Finished))
		.order_by(reading_session::Column::UpdatedAt, Order::Desc)
		.order_by(reading_session::Column::Id, Order::Desc)
		.limit(1)
		.to_owned();

	let reset_at_subq = Query::select()
		.column(reading_progress_reset::Column::ResetAt)
		.from(reading_progress_reset::Entity)
		.and_where(reading_progress_reset::Column::UserId.eq(user_id.clone()))
		.and_where(
			Expr::col((
				reading_progress_reset::Entity,
				reading_progress_reset::Column::MediaId,
			))
			.equals((media::Entity, media::Column::Id)),
		)
		.to_owned();
	let reset_reported_at_subq = Query::select()
		.column(reading_progress_reset::Column::ReportedAt)
		.from(reading_progress_reset::Entity)
		.and_where(reading_progress_reset::Column::UserId.eq(user_id.clone()))
		.and_where(
			Expr::col((
				reading_progress_reset::Entity,
				reading_progress_reset::Column::MediaId,
			))
			.equals((media::Entity, media::Column::Id)),
		)
		.to_owned();

	query
		.column_as(
			Expr::col((reading_session::Entity, reading_session::Column::Id)),
			"reading_sessionsid",
		)
		.column_as(
			Expr::col((reading_session::Entity, reading_session::Column::CreatedAt)),
			"reading_sessionscreated_at",
		)
		.column_as(
			Expr::col((reading_session::Entity, reading_session::Column::UpdatedAt)),
			"reading_sessionsupdated_at",
		)
		.column_as(
			Expr::col((reading_session::Entity, reading_session::Column::ReportedAt)),
			"reading_sessionsreported_at",
		)
		.column_as(
			Expr::col((
				reading_session::Entity,
				reading_session::Column::EndPercentage,
			)),
			"reading_sessionsend_percentage",
		)
		.column_as(
			Expr::col((reading_session::Entity, reading_session::Column::EndLocator)),
			"reading_sessionsend_locator",
		)
		.column_as(
			Expr::col((reading_session::Entity, reading_session::Column::Status)),
			"reading_sessionsstatus",
		)
		// LEFT JOIN reading_sessions on media.id = reading_sessions.media_id
		//  AND reading_sessions.user_id = $user_id AND reading_sessions.created_at IN (latest_subq)
		.join_rev(
			JoinType::LeftJoin,
			reading_session::Entity::belongs_to(media::Entity)
				.from(reading_session::Column::MediaId)
				.to(media::Column::Id)
				.on_condition({
					let user_id = user_id.clone();
					let latest_subq = latest_subq.clone();
					move |_left, _right| {
						Condition::all()
							.add(reading_session::Column::UserId.eq(user_id.clone()))
							.add(
								Expr::col((
									reading_session::Entity,
									reading_session::Column::CreatedAt,
								))
								.in_subquery(latest_subq.clone()),
							)
					}
				})
				.into(),
		)
		.column_as(
			SimpleExpr::SubQuery(
				None,
				Box::new(SubQueryStatement::SelectStatement(completed_count_subq)),
			),
			"finished_reading_session_count",
		)
		.column_as(
			SimpleExpr::SubQuery(
				None,
				Box::new(SubQueryStatement::SelectStatement(last_completed_subq)),
			),
			"finished_reading_session_last_completed_at",
		)
		.column_as(
			SimpleExpr::SubQuery(
				None,
				Box::new(SubQueryStatement::SelectStatement(
					last_completed_reported_at_subq,
				)),
			),
			"finished_reading_session_last_reported_at",
		)
		.column_as(
			SimpleExpr::SubQuery(
				None,
				Box::new(SubQueryStatement::SelectStatement(reset_at_subq)),
			),
			"reading_progress_reset_at",
		)
		.column_as(
			SimpleExpr::SubQuery(
				None,
				Box::new(SubQueryStatement::SelectStatement(reset_reported_at_subq)),
			),
			"reading_progress_reset_reported_at",
		)
		.group_by(media::Column::Id)
}

impl MediaWithMetadataAndReadingSessions {
	pub fn find_by_id_for_user(id: String, user: &AuthUser) -> Select<media::Entity> {
		let select = media::ModelWithMetadata::find_by_id_for_user(id, user);
		apply_reading_session_joins(select, user)
	}

	pub fn find_by_ids_for_user(
		ids: &[String],
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
			reading_progress_reset_at: res.try_get("", "reading_progress_reset_at")?,
			reading_progress_reset_reported_at: res
				.try_get("", "reading_progress_reset_reported_at")?,
			finished_reading_session_count: res
				.try_get("", "finished_reading_session_count")?,
			finished_reading_session_last_completed_at: res
				.try_get("", "finished_reading_session_last_completed_at")?,
			finished_reading_session_last_reported_at: res
				.try_get("", "finished_reading_session_last_reported_at")?,
		})
	}
}

// a UUID that we can use when we don't have an ID that is more appropriate.
const DUMMY_UUID: &str = "00000000-0000-0000-0000-000000000001";

impl BookMetadata {
	pub fn from_media(m: &MediaWithMetadataAndReadingSessions, book_url: String) -> Self {
		let media_id = &m.media.id;

		let writers = m.metadata.as_ref().and_then(|mm| mm.writers.clone());
		let publication_date =
			m.metadata
				.as_ref()
				.and_then(|mm| match (mm.year, mm.month, mm.day) {
					(Some(year), month, day) => Date::from_ymd_opt(
						year,
						month.and_then(|v| u32::try_from(v).ok()).unwrap_or(1),
						day.and_then(|v| u32::try_from(v).ok()).unwrap_or(1),
					),
					_ => None,
				});

		let series = m.metadata.as_ref().and_then(|mm| {
			match (m.media.series_id.clone(), mm.series.clone(), mm.number) {
				(Some(series_id), Some(series), series_number) => Some(Series {
					id: series_id,
					name: series,
					number: series_number
						.map(|n| n.to_string())
						.unwrap_or("1".to_string()),
					number_float: series_number.and_then(|n| n.to_f32()).unwrap_or(1.0),
				}),
				_ => None,
			}
		});

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
			description: m.metadata.as_ref().and_then(|mm| mm.summary.clone()),
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
			isbn: m
				.metadata
				.as_ref()
				.and_then(|mm| mm.identifier_isbn.clone()),
			language: "en".to_string(),
			phonetic_pronunciations: Empty {},
			publication_date: publication_date
				.and_then(|pd| pd.and_hms_opt(0, 0, 0))
				.map(|pd| pd.and_utc()),
			publisher: m.metadata.as_ref().and_then(|mm| mm.publisher.clone()).map(
				|mp| Publisher {
					imprint: "".to_string(),
					name: mp,
				},
			),
			revision_id: media_id.clone(),
			series,
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
	fn unread(
		media_id: String,
		created: chrono::DateTime<Utc>,
		last_modified: chrono::DateTime<Utc>,
	) -> Self {
		ReadingState {
			created,
			current_bookmark: CurrentBookmark {
				last_modified,
				progress_percent: None,
				content_source_progress_percent: None,
				location: None,
			},
			entitlement_id: media_id,
			last_modified,
			priority_timestamp: last_modified,
			statistics: Statistics { last_modified },
			status_info: StatusInfo {
				last_modified,
				status: Status::ReadyToRead,
				times_started_reading: 0,
			},
		}
	}

	fn finished(
		media_id: String,
		created: chrono::DateTime<Utc>,
		last_completed_at: DateTimeWithTimeZone,
		positions: Option<&KoboPositionMap>,
	) -> Self {
		let utc_completed_at = last_completed_at.to_utc();
		let position = positions.and_then(KoboPositionMap::last);
		let location = position.as_ref().map(|position| Location {
			value: Some(position.value.clone()),
			type_: Some("KoboSpan".to_string()),
			source: position.source.clone(),
		});

		ReadingState {
			created,
			current_bookmark: CurrentBookmark {
				last_modified: utc_completed_at,
				progress_percent: Some(100.0),
				content_source_progress_percent: position
					.map(|position| position.progression * 100.0),
				location,
			},
			entitlement_id: media_id,
			last_modified: utc_completed_at,
			priority_timestamp: utc_completed_at,
			statistics: Statistics {
				last_modified: utc_completed_at,
			},
			status_info: StatusInfo {
				last_modified: utc_completed_at,
				status: Status::Finished,
				times_started_reading: 1,
			},
		}
	}

	fn from_active_reading_session(
		media_id: String,
		rs: &ReadingSession,
		positions: Option<&KoboPositionMap>,
	) -> Self {
		let updated_or_started_at = rs
			.reported_at
			.or(rs.updated_at)
			.unwrap_or(rs.created_at)
			.to_utc();
		let total_progression = rs
			.end_percentage
			.and_then(|progression| progression.to_f32())
			.map(|progression| progression.clamp(0.0, 1.0));
		let position = positions.and_then(|positions| {
			positions.resolve(rs.end_locator.as_ref(), total_progression)
		});
		let location = position.as_ref().map(|position| Location {
			value: Some(position.value.clone()),
			type_: Some("KoboSpan".to_string()),
			source: position.source.clone(),
		});
		let progress_percent = total_progression.map(|progression| progression * 100.0);
		let content_source_progress_percent = position
			.map(|position| position.progression * 100.0)
			.or(progress_percent);

		ReadingState {
			created: rs.created_at.to_utc(),
			current_bookmark: CurrentBookmark {
				last_modified: updated_or_started_at,
				progress_percent,
				content_source_progress_percent,
				location,
			},
			entitlement_id: media_id,
			last_modified: updated_or_started_at,
			priority_timestamp: updated_or_started_at,
			statistics: Statistics {
				last_modified: updated_or_started_at,
			},
			status_info: StatusInfo {
				last_modified: updated_or_started_at,
				status: Status::Reading,
				times_started_reading: 1,
			},
		}
	}

	pub fn from_media(
		m: &MediaWithMetadataAndReadingSessions,
		positions: Option<&KoboPositionMap>,
	) -> Self {
		let media_id = m.media.id.clone();
		let media_created_at = m.media.created_at.to_utc();
		let session_modified_at = m
			.reading_session
			.as_ref()
			.map(|session| session.updated_at.unwrap_or(session.created_at));

		if let Some(reset_at) = m.reading_progress_reset_at.filter(|reset_at| {
			session_modified_at.is_none_or(|session_at| *reset_at >= session_at)
		}) {
			return Self::unread(
				media_id,
				media_created_at,
				m.reading_progress_reset_reported_at
					.unwrap_or(reset_at)
					.to_utc(),
			);
		}

		match (
			m.reading_session.as_ref(),
			m.finished_reading_session_last_completed_at,
		) {
			// An abandoned reread does not erase an earlier completion.
			(Some(rs), Some(last_completed_at))
				if rs.status == ReadingStatus::Abandoned =>
			{
				let last_modified = m
					.finished_reading_session_last_reported_at
					.unwrap_or(last_completed_at)
					.max(rs.reported_at.or(rs.updated_at).unwrap_or(rs.created_at));
				Self::finished(media_id, media_created_at, last_modified, positions)
			},
			(Some(rs), None) if rs.status == ReadingStatus::Abandoned => Self::unread(
				media_id,
				media_created_at,
				rs.reported_at
					.or(rs.updated_at)
					.unwrap_or(rs.created_at)
					.to_utc(),
			),
			(Some(rs), _) if rs.status == ReadingStatus::Finished => Self::finished(
				media_id,
				media_created_at,
				rs.reported_at
					.or(m.finished_reading_session_last_reported_at)
					.unwrap_or_else(|| {
						m.finished_reading_session_last_completed_at
							.unwrap_or(rs.updated_at.unwrap_or(rs.created_at))
					}),
				positions,
			),
			(Some(active), _) => {
				Self::from_active_reading_session(media_id, active, positions)
			},
			(_, Some(last_completed_at)) => Self::finished(
				media_id,
				media_created_at,
				m.finished_reading_session_last_reported_at
					.unwrap_or(last_completed_at),
				positions,
			),
			_ => Self::unread(media_id, media_created_at, media_created_at),
		}
	}
}

impl BookEntitlementContainer {
	pub fn from_media(m: MediaWithMetadataAndReadingSessions, book_url: String) -> Self {
		Self::from_media_with_positions(m, book_url, None)
	}

	pub fn from_media_with_positions(
		m: MediaWithMetadataAndReadingSessions,
		book_url: String,
		positions: Option<&KoboPositionMap>,
	) -> Self {
		let media_id = &m.media.id;
		let reading_state = ReadingState::from_media(&m, positions);

		BookEntitlementContainer {
			book_entitlement: BookEntitlement {
				accessibility: "Full".to_string(),
				active_period: Period {
					from: m.media.created_at.to_utc(),
				},
				created: m.media.created_at.to_utc(),
				cross_revision_id: media_id.clone(),
				id: media_id.clone(),
				is_hidden_from_archive: false,
				is_locked: false,
				is_removed: false,
				last_modified: m.media.modified_at.unwrap_or(m.media.created_at).to_utc(),
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
	use std::time::Duration;

	use chrono::{Duration as ChronoDuration, Utc};
	use models::entity::{reading_session, user};
	use models::services::reading_progress::{
		mark_reading_progress_reset, reset_reading_progress, upsert_reading_session,
		NormalizedProgression,
	};
	use rust_decimal::Decimal;
	use sea_orm::prelude::DateTimeWithTimeZone;
	use sea_orm::{ActiveModelTrait, DbConn, IntoActiveModel, Set};
	use tests::db::test_database;
	use tests::fake_data;

	use crate::kobo::entity::MediaWithMetadataAndReadingSessions;
	use crate::kobo::sync_types::{BookEntitlementContainer, ReadingState, Status};

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
	async fn test_reading_state_reset_until_newer_progress() {
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
			..Default::default()
		}
		.insert(&db)
		.await;
		fake_data::ReadingSession::completed(media.id.clone(), user.id.clone())
			.insert(&db)
			.await;

		mark_reading_progress_reset(&db, &user.id, &media.id)
			.await
			.unwrap();
		let reset = load_media(&db, &user, media.id.clone()).await;
		assert_eq!(
			BookEntitlementContainer::from_media(reset, String::new())
				.reading_state
				.unwrap()
				.status_info
				.status,
			Status::ReadyToRead
		);

		// The marker remains as history; a later session supersedes it by timestamp.
		tokio::time::sleep(Duration::from_millis(1)).await;
		upsert_reading_session(
			&db,
			&user,
			&media.id,
			NormalizedProgression {
				percentage: Some(Decimal::new(1, 1)),
				..Default::default()
			},
		)
		.await
		.unwrap();
		let reading = load_media(&db, &user, media.id.clone()).await;
		assert_eq!(reading.finished_reading_session_count, 1);
		assert_eq!(
			BookEntitlementContainer::from_media(reading, String::new())
				.reading_state
				.unwrap()
				.status_info
				.status,
			Status::Reading
		);

		let sessions = reading_session::Entity::find_for_user_and_media(&user, &media.id)
			.all(&db)
			.await
			.unwrap();
		assert_eq!(sessions.len(), 2);
		assert!(sessions.iter().any(|session| {
			session.status == models::shared::enums::ReadingStatus::Finished
				&& session.readthrough_number == 1
		}));
		assert!(sessions.iter().any(|session| {
			session.status == models::shared::enums::ReadingStatus::Reading
				&& session.readthrough_number == 2
		}));
	}

	#[tokio::test]
	async fn test_reading_state_timestamps_advance_after_future_client_clock() {
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
			..Default::default()
		}
		.insert(&db)
		.await;
		let future: DateTimeWithTimeZone =
			(Utc::now() + ChronoDuration::days(365)).into();

		upsert_reading_session(
			&db,
			&user,
			&media.id,
			NormalizedProgression {
				percentage: Some(Decimal::new(1, 1)),
				reported_at: Some(future),
				..Default::default()
			},
		)
		.await
		.unwrap();
		let client_state = BookEntitlementContainer::from_media(
			load_media(&db, &user, media.id.clone()).await,
			String::new(),
		)
		.reading_state
		.unwrap();
		assert_eq!(client_state.last_modified, future.to_utc());

		upsert_reading_session(
			&db,
			&user,
			&media.id,
			NormalizedProgression {
				percentage: Some(Decimal::new(2, 1)),
				..Default::default()
			},
		)
		.await
		.unwrap();
		let stump_state = BookEntitlementContainer::from_media(
			load_media(&db, &user, media.id.clone()).await,
			String::new(),
		)
		.reading_state
		.unwrap();
		assert!(stump_state.last_modified > client_state.last_modified);

		reset_reading_progress(&db, &user, &media.id).await.unwrap();
		let reset_state = BookEntitlementContainer::from_media(
			load_media(&db, &user, media.id.clone()).await,
			String::new(),
		)
		.reading_state
		.unwrap();
		assert_eq!(reset_state.status_info.status, Status::ReadyToRead);
		assert!(reset_state.last_modified > stump_state.last_modified);

		tokio::time::sleep(Duration::from_millis(1)).await;
		upsert_reading_session(
			&db,
			&user,
			&media.id,
			NormalizedProgression {
				percentage: Some(Decimal::new(1, 2)),
				..Default::default()
			},
		)
		.await
		.unwrap();
		let restarted_state = BookEntitlementContainer::from_media(
			load_media(&db, &user, media.id).await,
			String::new(),
		)
		.reading_state
		.unwrap();
		assert_eq!(restarted_state.status_info.status, Status::Reading);
		assert!(restarted_state.last_modified > reset_state.last_modified);
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
			end_percentage: 0.5,
			..Default::default()
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

	#[test]
	fn test_reading_state_omits_an_unvalidated_kobo_span() {
		let session = super::ReadingSession {
			created_at: "2026-08-25T00:00:00Z".parse().unwrap(),
			updated_at: None,
			reported_at: None,
			end_percentage: Some(Decimal::new(1, 1)),
			end_locator: Some(models::shared::readium::ReadiumLocator {
				href: "OPS/chapter.xhtml".to_string(),
				locations: Some(models::shared::readium::ReadiumLocation {
					kobo_span: Some("stale-span".to_string()),
					..Default::default()
				}),
				..Default::default()
			}),
			status: models::shared::enums::ReadingStatus::Reading,
		};

		let state = ReadingState::from_active_reading_session(
			"book-id".to_string(),
			&session,
			None,
		);
		assert_eq!(state.current_bookmark.progress_percent, Some(10.0));
		assert_eq!(state.current_bookmark.location, None);
	}

	#[tokio::test]
	async fn test_reading_state_abandoned_no_prior_completion() {
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

		// abandoned without ever having finished it
		fake_data::ReadingSession {
			media_id: media.id.clone(),
			user_id: user.id.clone(),
			end_percentage: 0.4,
			status: models::shared::enums::ReadingStatus::Abandoned,
			..Default::default()
		}
		.insert(&db)
		.await;

		let m = load_media(&db, &user, media.id).await;

		let entitlement =
			BookEntitlementContainer::from_media(m, "https://example.org/".to_string());

		// TODO(kobo): see above re: whether abandoned + no prior complete = unread is ideal
		let reading_state = entitlement.reading_state.unwrap();
		assert_eq!(Status::ReadyToRead, reading_state.status_info.status);
	}

	#[tokio::test]
	async fn test_reading_state_abandoned_after_prior_completion() {
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

		// first readthrough was completed, then the re-read was abandoned
		let completed = fake_data::ReadingSession {
			media_id: media.id.clone(),
			user_id: user.id.clone(),
			end_percentage: 1.0,
			status: models::shared::enums::ReadingStatus::Finished,
			created_at: Some("2026-05-26T00:00:00Z".parse().unwrap()),
		}
		.insert(&db)
		.await;
		let reported_at: DateTimeWithTimeZone = "2030-01-01T00:00:00Z".parse().unwrap();
		let mut completed = completed.into_active_model();
		completed.reported_at = Set(Some(reported_at));
		completed.update(&db).await.unwrap();

		let abandoned = fake_data::ReadingSession {
			media_id: media.id.clone(),
			user_id: user.id.clone(),
			end_percentage: 0.3,
			status: models::shared::enums::ReadingStatus::Abandoned,
			created_at: Some("2026-05-27T00:00:00Z".parse().unwrap()),
		}
		.insert(&db)
		.await;

		let m = load_media(&db, &user, media.id).await;

		let entitlement =
			BookEntitlementContainer::from_media(m, "https://example.org/".to_string());

		// non-dnf should always take precendence over dnf if newer
		let reading_state = entitlement.reading_state.unwrap();
		assert_eq!(Status::Finished, reading_state.status_info.status);
		assert_eq!(
			abandoned.reported_at.unwrap().to_utc(),
			reading_state.last_modified
		);
		assert!(reading_state.last_modified > reported_at.to_utc());
	}

	#[tokio::test]
	async fn test_reading_state_rereading() {
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

		// first readthrough is complete
		fake_data::ReadingSession {
			media_id: media.id.clone(),
			user_id: user.id.clone(),
			end_percentage: 1.0,
			status: models::shared::enums::ReadingStatus::Finished,
			created_at: Some("2026-05-26T00:00:00Z".parse().unwrap()),
		}
		.insert(&db)
		.await;

		// second readthrough is in-progress
		fake_data::ReadingSession {
			media_id: media.id.clone(),
			user_id: user.id.clone(),
			end_percentage: 0.35,
			status: models::shared::enums::ReadingStatus::Reading,
			created_at: Some("2026-05-27T00:00:00Z".parse().unwrap()),
		}
		.insert(&db)
		.await;

		let m = load_media(&db, &user, media.id).await;

		let entitlement =
			BookEntitlementContainer::from_media(m, "https://example.org/".to_string());

		// the re-read in-progress should take precedence
		let reading_state = entitlement.reading_state.unwrap();
		assert_eq!(Status::Reading, reading_state.status_info.status);

		let bookmark = reading_state.current_bookmark;
		assert_eq!(Some(35.0), bookmark.progress_percent);
		assert_eq!(Some(35.0), bookmark.content_source_progress_percent);
		assert_eq!(None, bookmark.location);
	}

	#[tokio::test]
	async fn test_reading_state_finished_multiple_readthroughs() {
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

		fake_data::ReadingSession {
			media_id: media.id.clone(),
			user_id: user.id.clone(),
			end_percentage: 1.0,
			status: models::shared::enums::ReadingStatus::Finished,
			created_at: Some("2026-05-26T00:00:00Z".parse().unwrap()),
		}
		.insert(&db)
		.await;

		fake_data::ReadingSession {
			media_id: media.id.clone(),
			user_id: user.id.clone(),
			end_percentage: 1.0,
			status: models::shared::enums::ReadingStatus::Finished,
			created_at: Some("2026-05-27T00:00:00Z".parse().unwrap()),
		}
		.insert(&db)
		.await;

		let m = load_media(&db, &user, media.id).await;

		assert_eq!(2, m.finished_reading_session_count);

		let entitlement =
			BookEntitlementContainer::from_media(m, "https://example.org/".to_string());

		let reading_state = entitlement.reading_state.unwrap();
		assert_eq!(Status::Finished, reading_state.status_info.status);
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

		fake_data::ReadingSession::completed(media.id.clone(), user.id.clone())
			.insert(&db)
			.await;

		let m = load_media(&db, &user, media.id).await;

		let entitlement =
			BookEntitlementContainer::from_media(m, "https://example.org/".to_string());

		// we finished this book.
		let reading_state = entitlement.reading_state.unwrap();
		assert_eq!(Status::Finished, reading_state.status_info.status);

		let bookmark = reading_state.current_bookmark;
		assert_eq!(Some(100.0), bookmark.progress_percent);
		assert_eq!(None, bookmark.content_source_progress_percent);
		assert_eq!(None, bookmark.location);
	}
}
