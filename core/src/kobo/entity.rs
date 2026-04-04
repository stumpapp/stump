use crate::kobo::sync_types::*;
use chrono::Utc;
use models::entity::{media, reading_session};

// a UUID that we can use when we don't have an ID that is more appropriate.
const DUMMY_UUID: &str = "00000000-0000-0000-0000-000000000001";

impl BookMetadata {
	pub fn from_media(m: &media::ModelWithMetadata, book_url: String) -> Self {
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

	pub fn from_active_reading_session(
		media_id: String,
		rs: Option<&reading_session::Model>,
	) -> Self {
		match rs {
			None => ReadingState::unread(media_id),
			Some(rs) => ReadingState {
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
			},
		}
	}
}

impl BookEntitlementContainer {
	pub fn from_media(
		m: media::ModelWithMetadata,
		rs: Option<&reading_session::Model>,
		book_url: String,
	) -> Self {
		let media_id = &m.media.id;

		let reading_state =
			ReadingState::from_active_reading_session(media_id.clone(), rs);

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
