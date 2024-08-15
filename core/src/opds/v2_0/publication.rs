//! A module for representing OPDS 2.0 publications, as defined by the OPDS 2.0 spec at
//! https://drafts.opds.io/opds-2.0#51-opds-publication

use std::collections::HashMap;

use derive_builder::Builder;
use serde::{Deserialize, Serialize};
use serde_with::skip_serializing_none;

use crate::{
	db::entity::{MediaMetadata, PageDimensionsEntity},
	filesystem::{get_content_type_for_page, ContentType},
	prisma::{page_dimensions, PrismaClient},
	CoreError, CoreResult,
};

use super::{
	books_as_publications,
	link::{
		OPDSBaseLinkBuilder, OPDSImageLink, OPDSImageLinkBuilder, OPDSLink,
		OPDSLinkFinalizer, OPDSLinkRel, OPDSLinkType,
	},
	metadata::{
		OPDSDynamicMetadata, OPDSEntryBelongsTo, OPDSMetadata, OPDSMetadataBuilder,
	},
	properties::{OPDSProperties, AUTH_ROUTE},
	utils::OPDSV2PrismaExt,
};

/// An OPDS Publication is essentially a Readium Web Publication without the requirement
/// to include a readingOrder collection. An OPDS Publication:
///
/// - Must be identified by the following media type: application/opds-publication+json
/// - Must contain at least one [Acquisition Link](https://drafts.opds.io/opds-2.0#53-acquisition-link)
/// - Should contain a self link
///
/// See https://drafts.opds.io/opds-2.0#51-opds-publication
/// See https://readium.org/webpub-manifest/context.jsonld
#[skip_serializing_none]
#[derive(Debug, Default, Clone, Builder, Serialize, Deserialize)]
#[builder(build_fn(error = "crate::CoreError"), default, setter(into))]
#[serde(rename_all = "camelCase")]
pub struct OPDSPublication {
	/// The context for the publication
	#[serde(default = "OPDSPublication::default_context")]
	#[builder(default = "OPDSPublication::default_context()")]
	context: String,
	/// The metadata for the publication
	pub metadata: OPDSMetadata,
	pub links: Option<Vec<OPDSLink>>,
	pub images: Option<Vec<OPDSImageLink>>,
	// TODO: this is literally mentioned once in the spec and that's it... Likely need to check
	// the Readium Web Publication spec for more information? From once example, it looks like links
	// are the eventual type, but need to confirm.
	pub reading_order: Option<Vec<OPDSLink>>,
	pub resources: Option<Vec<OPDSLink>>,
	pub toc: Option<Vec<OPDSLink>>,
	pub landmarks: Option<Vec<OPDSLink>>,
	pub page_list: Option<Vec<OPDSLink>>,
}

impl OPDSPublication {
	pub fn default_context() -> String {
		"https://readium.org/webpub-manifest/context.jsonld".to_string()
	}

	pub async fn vec_from_books(
		client: &PrismaClient,
		finalizer: OPDSLinkFinalizer,
		books: Vec<books_as_publications::Data>,
	) -> CoreResult<Vec<Self>> {
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
				let links = OPDSPublication::links_for_book(&book, &finalizer)?;
				let images = OPDSPublication::images_for_book(&book, &finalizer)?;

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

				let publication = OPDSPublicationBuilder::default()
					.metadata(metadata)
					.links(links)
					.images(images)
					.build()?;

				publications.push(publication);
			}
		}

		Ok(publications)
	}

	pub async fn from_book(
		client: &PrismaClient,
		finalizer: OPDSLinkFinalizer,
		book: books_as_publications::Data,
	) -> CoreResult<Self> {
		let links = OPDSPublication::links_for_book(&book, &finalizer)?;
		let images = OPDSPublication::images_for_book(&book, &finalizer)?;

		let series = book
			.series
			.ok_or_else(|| CoreError::InternalError("Book has no series".to_string()))?;
		let positions = client
			.book_positions_in_series(vec![book.id.clone()], series.id.clone())
			.await?;
		let position = positions.get(&book.id).cloned();

		let metadata = book
			.metadata
			.clone()
			.map(MediaMetadata::from)
			.unwrap_or_default();
		let title = metadata.title.clone().unwrap_or(book.name);
		let description = metadata.summary.clone();

		let page_dimensions = client
			.page_dimensions()
			.find_first(vec![page_dimensions::metadata_id::equals(
				metadata.id.clone(),
			)])
			.exec()
			.await?
			.map(PageDimensionsEntity::from)
			.map(|pd| pd.dimensions);

		let mut reading_order = vec![];

		for (idx, dim) in page_dimensions.unwrap_or_default().into_iter().enumerate() {
			let base_link = OPDSBaseLinkBuilder::default()
				.href(finalizer.format_link(format!(
					"/opds/v2.0/books/{}/page/{}",
					book.id,
					idx + 1
				)))
				// FIXME(311): Don't make this assumption
				._type(OPDSLinkType::ImageJpeg)
				.build()?;
			let image_link = OPDSImageLinkBuilder::default()
				.height(dim.height)
				.width(dim.width)
				.base_link(base_link)
				.build()?;
			reading_order.push(OPDSLink::Image(image_link));
		}

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
			.dynamic_metadata(OPDSDynamicMetadata(serde_json::to_value(media_metadata)?))
			.build()?;

		let publication = OPDSPublicationBuilder::default()
			.metadata(metadata)
			.reading_order(reading_order)
			.links(links)
			.images(images)
			// Note: I'm not sure if this is necessary, but Cantook didn't seem to like when
			// the below vectors were missing from the publication (even when otherwise empty)
			.resources(vec![])
			.toc(vec![])
			.landmarks(vec![])
			.page_list(vec![])
			.build()?;

		Ok(publication)
	}

	fn images_for_book(
		book: &books_as_publications::Data,
		finalizer: &OPDSLinkFinalizer,
	) -> CoreResult<Vec<OPDSImageLink>> {
		Ok(vec![OPDSImageLinkBuilder::default()
			.base_link(
				OPDSBaseLinkBuilder::default()
					.href(
						finalizer.format_link(format!(
							"/opds/v2.0/books/{}/thumbnail",
							book.id
						)),
					)
					._type(OPDSLinkType::from(get_content_type_for_page(
						&book.path, 1,
					)?))
					.build()?
					.with_auth(finalizer.format_link(AUTH_ROUTE)),
			)
			.build()?])
	}

	fn links_for_book(
		book: &books_as_publications::Data,
		finalizer: &OPDSLinkFinalizer,
	) -> CoreResult<Vec<OPDSLink>> {
		Ok(finalizer.finalize_all(vec![
			OPDSLink::Link(
				OPDSBaseLinkBuilder::default()
					.href(format!("/opds/v2.0/books/{}", book.id))
					.rel(OPDSLinkRel::SelfLink.item())
					._type(OPDSLinkType::DivinaJson)
					.properties(
						OPDSProperties::default()
							.with_auth(finalizer.format_link(AUTH_ROUTE)),
					)
					.build()?,
			),
			OPDSLink::Link(
				OPDSBaseLinkBuilder::default()
					.href(format!("/opds/v2.0/books/{}/file", book.id))
					.rel(OPDSLinkRel::Acquisition.item())
					._type(OPDSLinkType::from(ContentType::from_extension(
						&book.extension,
					)))
					.properties(
						OPDSProperties::default()
							.with_auth(finalizer.format_link(AUTH_ROUTE)),
					)
					.build()?,
			),
			OPDSLink::progression(book.id.clone(), finalizer),
		]))
	}
}

#[cfg(test)]
mod tests {
	use prisma_client_rust::chrono::Utc;

	use crate::{
		db::FileStatus,
		filesystem::media::tests::get_test_epub_path,
		opds::v2_0::{
			metadata::OPDSEntryBelongsToEntityBuilder,
			utils::{book_positions_in_series_raw_query, EntityPosition},
		},
	};

	use super::*;

	fn mock_book() -> books_as_publications::Data {
		books_as_publications::Data {
			id: "1".to_string(),
			name: "Book 1".to_string(),
			metadata: None,
			series: Some(books_as_publications::series::Data {
				id: "1".to_string(),
				name: "Series 1".to_string(),
				metadata: None,
			}),
			created_at: Utc::now().into(),
			updated_at: Utc::now().into(),
			extension: String::from("epub"),
			path: get_test_epub_path(),
			status: FileStatus::Ready.to_string(),
			hash: Some(String::from("hash")),
			series_id: Some("1".to_string()),
			pages: 0,
			modified_at: None,
			size: 2000,
		}
	}

	#[test]
	fn test_publication_serialization() {
		let publication = OPDSPublication {
			context: OPDSPublication::default_context(),
			metadata: OPDSMetadataBuilder::default()
				.title("Book".to_string())
				.modified("2021-08-01T00:00:00Z".to_string())
				.description(Some("A cool book".to_string()))
				.belongs_to(OPDSEntryBelongsTo::Series(
					OPDSEntryBelongsToEntityBuilder::default()
						.name("Test Series".to_string())
						.position(Some(1))
						.build()
						.expect("Failed to build belongs_to"),
				))
				.dynamic_metadata(OPDSDynamicMetadata(serde_json::json!({
					"test": "value"
				})))
				.build()
				.expect("Failed to build metadata"),
			..Default::default()
		};

		let json = serde_json::to_string(&publication).unwrap();
		dbg!(&json);
		assert_eq!(
			json,
			r#"{"context":"https://readium.org/webpub-manifest/context.jsonld","metadata":{"title":"Book","modified":"2021-08-01T00:00:00Z","description":"A cool book","belongsTo":{"series":{"name":"Test Series","position":1}},"test":"value"}}"#
		);
	}

	#[tokio::test]
	async fn test_vec_from_books() {
		let books = vec![
			mock_book(),
			books_as_publications::Data {
				id: "2".to_string(),
				name: "Book 2".to_string(),
				..mock_book()
			},
		];

		let (client, mock) = PrismaClient::_mock();

		mock.expect(
			client._query_raw(book_positions_in_series_raw_query(
				vec!["1".to_string(), "2".to_string()],
				"1".to_string(),
			)),
			vec![
				EntityPosition {
					id: "1".to_string(),
					position: 1,
				},
				EntityPosition {
					id: "2".to_string(),
					position: 2,
				},
			],
		)
		.await;

		let publications = OPDSPublication::vec_from_books(
			&client,
			OPDSLinkFinalizer::new("https://my-stump-instance.cloud".to_string()),
			books,
		)
		.await
		.expect("Failed to generate publications");

		assert_eq!(publications.len(), 2);
		assert!(matches!(publications[0].reading_order, None));
	}

	#[tokio::test]
	async fn test_from_book() {
		let book = mock_book();

		let (client, mock) = PrismaClient::_mock();

		mock.expect(
			client._query_raw(book_positions_in_series_raw_query(
				vec!["1".to_string()],
				"1".to_string(),
			)),
			vec![EntityPosition {
				id: "1".to_string(),
				position: 1,
			}],
		)
		.await;

		mock.expect(
			client
				.page_dimensions()
				// When metadata is not set, the metadata ID is an empty string. This will never load, but for
				// the sake of the test it should be acceptable
				.find_first(vec![page_dimensions::metadata_id::equals("".to_string())]),
			Some(page_dimensions::Data {
				id: "1".to_string(),
				metadata_id: "1".to_string(),
				dimensions: "1920,1080;800,600;1920,1080".to_string(),
				metadata: None,
			}),
		)
		.await;

		let publication = OPDSPublication::from_book(
			&client,
			OPDSLinkFinalizer::new("https://my-stump-instance.cloud".to_string()),
			book,
		)
		.await
		.expect("Failed to generate publication");

		assert!(matches!(publication.reading_order, Some(_)));
	}
}
