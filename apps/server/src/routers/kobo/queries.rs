use crate::routers::kobo::sync_types::*;
use chrono::Utc;
use models::entity::media;

impl BookMetadata {
	pub fn from_media(m: &media::ModelWithMetadata, book_url: String) -> Self {
		let dummy_uuid = "00000000-0000-0000-0000-000000000001";
		let media_id = &m.media.id;

		let writers = m.metadata.clone().and_then(|mm| mm.writers);

		BookMetadata {
			categories: vec![dummy_uuid.to_string()],
			contributor_roles: writers
				.clone()
				.into_iter()
				.map(|w| ContributorRole {
					name: w.to_string(),
				})
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
				format: "EPUB3".to_string(), // TODO
				size: u64::try_from(m.media.size).unwrap_or(0),
				platform: "Generic".to_string(),
				url: book_url,
			}],
			entitlement_id: media_id.clone(),
			external_ids: vec![],
			genre: dummy_uuid.to_string(),
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
				.clone()
				.and_then(|mm| mm.title)
				.unwrap_or(m.media.name.clone()),
			work_id: media_id.clone(),
		}
	}
}

impl BookEntitlementContainer {
	pub fn from_media(m: media::ModelWithMetadata, book_url: String) -> Self {
		let media_id = &m.media.id;

		// TODO
		let reading_state = ReadingState {
			created: Utc::now(),
			current_bookmark: CurrentBookmark {
				last_modified: Utc::now(),
				progress_percent: None,
				content_source_progress_percent: None,
				location: None,
			},
			entitlement_id: media_id.clone(),
			last_modified: Utc::now(),
			priority_timestamp: Utc::now(),
			statistics: Statistics {
				last_modified: Utc::now(),
			},
			status_info: StatusInfo {
				last_modified: Utc::now(),
				status: "ReadyToRead".to_string(),
				times_started_reading: 0,
			},
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
