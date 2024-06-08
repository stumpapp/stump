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
#[derive(Debug, Default, Clone, Builder, Serialize, Deserialize)]
#[builder(build_fn(error = "crate::CoreError"), default, setter(into))]
#[serde(rename_all = "camelCase")]
#[skip_serializing_none]
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
	pub async fn from_book(
		ctx: &Ctx,
		book: books_as_publications::Data,
	) -> CoreResult<Self> {
		let client = &ctx.db;

		let series = book.series.ok_or_else(|| {
			CoreError::InternalError("Book is not part of a series".to_string())
		})?;
		let position = client
			.book_positions_in_series(vec![book.id.clone()], series.id.clone())
			.await?
			.get(&book.id)
			.cloned();

		let metadata = book
			.metadata
			.clone()
			.map(MediaMetadata::from)
			.unwrap_or_default();
		let title = metadata.title.clone().unwrap_or(book.name);
		let description = metadata.summary.clone();

		// Unset the title and summary so they don't get serialized twice
		let metadata = MediaMetadata {
			title: None,
			summary: None,
			..metadata
		};

		// TODO: consolidate this into a TryFrom trait?
		let metadata = OPDSMetadataBuilder::default()
			.title(title)
			.modified(OPDSMetadata::generate_modified())
			.description(description)
			.belongs_to(OPDSEntryBelongsTo::from((series, position)))
			.dynamic_metadata(OPDSDynamicMetadata(serde_json::to_value(metadata)?))
			.build()?;

		Ok(Self {
			metadata,
			images: vec![],
			reading_order: None,
		})
	}
}
