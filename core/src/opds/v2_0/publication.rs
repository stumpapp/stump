use std::collections::HashMap;

use derive_builder::Builder;
use serde::{Deserialize, Serialize};
use serde_with::skip_serializing_none;

use crate::{db::entity::MediaMetadata, CoreError, CoreResult, Ctx};

use super::{
	books_as_publications,
	link::{OPDSImageLink, OPDSLink},
	metadata::{
		OPDSDynamicMetadata, OPDSEntryBelongsTo, OPDSMetadata, OPDSMetadataBuilder,
	},
	utils::OPDSV2PrismaExt,
};

/// An OPDS Publication is essentially a Readium Web Publication without the requirement
/// to include a readingOrder collection. An OPDS Publication:
/// - Must be identified by the following media type: application/opds-publication+json
/// - Must contain at least one [Acquisition Link](https://drafts.opds.io/opds-2.0#53-acquisition-link)
/// - Should contain a self link
///
/// See https://drafts.opds.io/opds-2.0#51-opds-publication
#[skip_serializing_none]
#[derive(Debug, Default, Clone, Builder, Serialize, Deserialize)]
#[builder(build_fn(error = "crate::CoreError"), default, setter(into))]
#[serde(rename_all = "camelCase")]
pub struct OPDSPublication {
	/// The metadata for the publication
	pub metadata: OPDSMetadata,
	#[serde(default)]
	pub images: Vec<OPDSImageLink>,
	// TODO: this is literally mentioned once in the spec and that's it... Likely need to check
	// the Readium Web Publication spec for more information? From once example, it looks like links
	// are the eventual type, but need to confirm.
	pub reading_order: Option<Vec<OPDSLink>>,
}

impl OPDSPublication {
	pub async fn vec_from_books(
		ctx: &Ctx,
		books: Vec<books_as_publications::Data>,
	) -> CoreResult<Vec<Self>> {
		let client = &ctx.db;

		let mut series_to_books_map = HashMap::new();
		let mut series_id_to_series_map = HashMap::new();

		for book in books {
			if let Some(series) = &book.series {
				series_to_books_map
					.entry(series.id.clone())
					.or_insert_with(Vec::new)
					.push(book.clone());
				series_id_to_series_map.insert(series.id.to_string(), series.clone());
			} else {
				tracing::warn!(book_id = ?book.id, "Book has no series ID!");
			}
		}

		let mut publications = vec![];

		for (series_id, books) in series_to_books_map {
			let series = series_id_to_series_map
				.get(&series_id)
				.ok_or_else(|| {
					CoreError::InternalError("Series not found in series map".to_string())
				})?
				.clone();

			let positions = client
				.book_positions_in_series(
					books.iter().map(|book| book.id.clone()).collect(),
					series.id.clone(),
				)
				.await?;

			for book in books {
				let position = positions.get(&book.id).cloned();

				let metadata = book
					.metadata
					.clone()
					.map(MediaMetadata::from)
					.unwrap_or_default();
				let title = metadata.title.clone().unwrap_or(book.name);
				let description = metadata.summary.clone();

				// Unset the title and summary so they don't get serialized twice
				let media_metadata = MediaMetadata {
					title: None,
					summary: None,
					..metadata
				};

				let metadata = OPDSMetadataBuilder::default()
					.title(title)
					.modified(OPDSMetadata::generate_modified())
					.description(description)
					.belongs_to(OPDSEntryBelongsTo::from((series.clone(), position)))
					.dynamic_metadata(OPDSDynamicMetadata(serde_json::to_value(
						media_metadata,
					)?))
					.build()?;

				publications.push(Self {
					metadata,
					..Default::default()
				});
			}
		}

		Ok(publications)
	}
}
