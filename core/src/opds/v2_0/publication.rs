//! A module for representing OPDS 2.0 publications, as defined by the OPDS 2.0 spec at
//! https://drafts.opds.io/opds-2.0#51-opds-publication

use std::collections::HashMap;

use derive_builder::Builder;
use models::entity::{media_metadata, page_analysis};
use sea_orm::{prelude::*, DatabaseConnection, EntityTrait, QueryFilter};
use serde::{Deserialize, Serialize};
use serde_with::skip_serializing_none;

use crate::{
	filesystem::{media::get_content_type_for_page, ContentType},
	CoreError, CoreResult,
};

use super::{
	entity::OPDSPublicationEntity,
	link::{
		OPDSBaseLinkBuilder, OPDSImageLink, OPDSImageLinkBuilder, OPDSLink,
		OPDSLinkFinalizer, OPDSLinkRel, OPDSLinkType,
	},
	metadata::{
		OPDSDynamicMetadata, OPDSEntryBelongsTo, OPDSMetadata, OPDSMetadataBuilder,
	},
	properties::{OPDSProperties, AUTH_ROUTE},
	utils::OPDSV2QueryExt,
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
		conn: &DatabaseConnection,
		finalizer: OPDSLinkFinalizer,
		books: Vec<OPDSPublicationEntity>,
	) -> CoreResult<Vec<Self>> {
		let mut series_to_books_map = HashMap::new();
		let mut series_id_to_series_map = HashMap::new();

		for book in &books {
			series_to_books_map
				.entry(book.series.id.clone())
				.or_insert_with(Vec::new)
				.push(book.media.id.clone());
			series_id_to_series_map.insert(book.series.id.clone(), book.series.clone());
		}

		let mut all_positions = HashMap::new();
		for (series_id, book_ids) in &series_to_books_map {
			let positions = conn
				.book_positions_in_series(book_ids.clone(), series_id.clone())
				.await?;
			all_positions.extend(positions);
		}

		let mut publications = Vec::with_capacity(books.len());

		for book in books {
			let series = series_id_to_series_map
				.get(&book.series.id)
				.ok_or_else(|| {
					CoreError::InternalError("Series not found in series map".to_string())
				})?
				.clone();

			let links = OPDSPublication::links_for_book(&book, &finalizer)?;
			let images = OPDSPublication::images_for_book(&book, &finalizer).await?;

			let position = all_positions.get(&book.media.id).copied();

			let metadata = book.metadata.clone().unwrap_or_default();
			let title = metadata.title.clone().unwrap_or(book.media.name);
			let description = metadata.summary.clone();

			// Unset the title and summary so they don't get serialized twice
			let media_metadata = media_metadata::Model {
				title: None,
				summary: None,
				..metadata
			};

			let metadata = OPDSMetadataBuilder::default()
				.title(title)
				.modified(OPDSMetadata::generate_modified())
				.description(description)
				.belongs_to(OPDSEntryBelongsTo::from((series, position)))
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

		Ok(publications)
	}

	pub async fn from_book(
		conn: &DatabaseConnection,
		finalizer: OPDSLinkFinalizer,
		book: OPDSPublicationEntity,
	) -> CoreResult<Self> {
		let links = OPDSPublication::links_for_book(&book, &finalizer)?;
		let images = OPDSPublication::images_for_book(&book, &finalizer).await?;

		let positions = conn
			.book_positions_in_series(vec![book.media.id.clone()], book.series.id.clone())
			.await?;
		let position = positions.get(&book.media.id).copied();

		let metadata = book.metadata.clone().unwrap_or_default();
		let title = metadata.title.clone().unwrap_or(book.media.name);
		let description = metadata.summary.clone();

		let page_dimensions = page_analysis::Entity::find()
			.filter(page_analysis::Column::MediaId.eq(book.media.id.clone()))
			.one(conn)
			.await?
			.map(|pd| pd.data.dimensions)
			.unwrap_or_default();

		let mut reading_order = vec![];

		for (idx, dim) in page_dimensions.into_iter().enumerate() {
			let base_link = OPDSBaseLinkBuilder::default()
				.href(finalizer.format_link(format!(
					"/opds/v2.0/books/{}/pages/{}",
					book.media.id,
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
		let media_metadata = media_metadata::Model {
			title: None,
			summary: None,
			..metadata
		};

		let metadata = OPDSMetadataBuilder::default()
			.title(title)
			.identifier(book.media.id.clone())
			.modified(OPDSMetadata::generate_modified())
			.description(description)
			.belongs_to(OPDSEntryBelongsTo::from((book.series.clone(), position)))
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

	async fn images_for_book(
		book: &OPDSPublicationEntity,
		finalizer: &OPDSLinkFinalizer,
	) -> CoreResult<Vec<OPDSImageLink>> {
		Ok(vec![OPDSImageLinkBuilder::default()
			.base_link(
				OPDSBaseLinkBuilder::default()
					.href(finalizer.format_link(format!(
						"/opds/v2.0/books/{}/thumbnail",
						book.media.id
					)))
					._type(OPDSLinkType::from(
						get_content_type_for_page(&book.media.path, 1).await?,
					))
					.build()?
					.with_auth(finalizer.format_link(AUTH_ROUTE)),
			)
			.build()?])
	}

	fn links_for_book(
		book: &OPDSPublicationEntity,
		finalizer: &OPDSLinkFinalizer,
	) -> CoreResult<Vec<OPDSLink>> {
		Ok(finalizer.finalize_all(vec![
			OPDSLink::Link(
				OPDSBaseLinkBuilder::default()
					.href(format!("/opds/v2.0/books/{}", book.media.id))
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
					.href(format!("/opds/v2.0/books/{}/file", book.media.id))
					.rel(OPDSLinkRel::Acquisition.item())
					._type(OPDSLinkType::from(ContentType::from_extension(
						&book.media.extension,
					)))
					.properties(
						OPDSProperties::default()
							.with_auth(finalizer.format_link(AUTH_ROUTE)),
					)
					.build()?,
			),
			OPDSLink::progression(book.media.id.clone(), finalizer),
		]))
	}
}

#[cfg(test)]
mod tests {
	use std::collections::BTreeMap;

	use chrono::Utc;
	use models::{
		entity::{media, media_metadata, page_analysis},
		shared::{
			enums::FileStatus,
			page_dimension::{PageAnalysis, PageDimension},
		},
	};
	use sea_orm::{DatabaseBackend::Sqlite, IntoMockRow, MockDatabase, Value};

	use crate::{
		filesystem::media::tests::get_test_epub_path,
		opds::v2_0::{entity::OPDSSeries, metadata::OPDSEntryBelongsToEntityBuilder},
	};

	use super::*;

	fn mock_book() -> OPDSPublicationEntity {
		OPDSPublicationEntity {
			media: media::Model {
				id: "1".to_string(),
				name: "Book 1".to_string(),
				created_at: Utc::now().into(),
				updated_at: Some(Utc::now().into()),
				deleted_at: None,
				extension: "epub".to_string(),
				path: get_test_epub_path(),
				status: FileStatus::Ready,
				hash: Some("hash".to_string()),
				koreader_hash: None,
				series_id: Some("1".to_string()),
				pages: 3,
				modified_at: None,
				size: 2000,
			},
			metadata: Some(media_metadata::Model {
				media_id: Some("1".to_string()),
				title: Some("Book 1 Title".to_string()),
				summary: Some("A cool book".to_string()),
				..Default::default()
			}),
			series: OPDSSeries {
				id: "1".to_string(),
				name: "Series 1".to_string(),
				metadata: None,
			},
			reading_session: None,
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
		assert_eq!(
			json,
			r#"{"context":"https://readium.org/webpub-manifest/context.jsonld","metadata":{"title":"Book","modified":"2021-08-01T00:00:00Z","description":"A cool book","belongsTo":{"series":{"name":"Test Series","position":1}},"test":"value"}}"#
		);
	}

	#[tokio::test]
	async fn test_vec_from_books() {
		let books = vec![
			mock_book(),
			OPDSPublicationEntity {
				media: media::Model {
					id: "2".to_string(),
					name: "Book 2".to_string(),
					..mock_book().media
				},
				..mock_book()
			},
		];

		let position_results = vec![
			BTreeMap::from([
				("id".to_string(), Value::from("1")),
				("position".to_string(), Value::from(1i64)),
			])
			.into_mock_row(),
			BTreeMap::from([
				("id".to_string(), Value::from("2")),
				("position".to_string(), Value::from(2i64)),
			])
			.into_mock_row(),
		];

		let db = MockDatabase::new(Sqlite)
			.append_query_results([position_results])
			.into_connection();

		let finalizer =
			OPDSLinkFinalizer::new("https://my-stump-instance.cloud".to_string());
		let publications = OPDSPublication::vec_from_books(&db, finalizer, books)
			.await
			.expect("Failed to generate publications");

		assert_eq!(publications.len(), 2);
		// vec_from_books doesn't create reading_order, only from_book does
		assert!(publications[0].reading_order.is_none());
		assert!(publications[0].links.is_some());
		assert!(publications[0].images.is_some());

		// Verify serialization works and contains expected fields
		let json = serde_json::to_value(&publications[0]).unwrap();
		assert!(json["metadata"]["title"].as_str().is_some());
		assert!(json["metadata"]["belongsTo"]["series"]["name"]
			.as_str()
			.is_some());
		assert!(json["links"].is_array());
		assert!(json["images"].is_array());
	}

	#[tokio::test]
	async fn test_from_book() {
		let book = mock_book();

		let position_results = vec![BTreeMap::from([
			("id".to_string(), Value::from("1")),
			("position".to_string(), Value::from(1i64)),
		])
		.into_mock_row()];

		// Mock the page analysis query result
		let page_analysis_results = vec![page_analysis::Model {
			id: 1,
			media_id: "1".to_string(),
			data: PageAnalysis {
				dimensions: vec![
					PageDimension {
						width: 1920,
						height: 1080,
					},
					PageDimension {
						width: 800,
						height: 600,
					},
					PageDimension {
						width: 1920,
						height: 1080,
					},
				],
			},
		}];

		let db = MockDatabase::new(Sqlite)
			.append_query_results([position_results])
			.append_query_results([page_analysis_results])
			.into_connection();

		let finalizer =
			OPDSLinkFinalizer::new("https://my-stump-instance.cloud".to_string());
		let publication = OPDSPublication::from_book(&db, finalizer, book)
			.await
			.expect("Failed to generate publication");

		assert!(publication.reading_order.is_some());
		let reading_order = publication.reading_order.as_ref().unwrap();
		assert_eq!(reading_order.len(), 3);

		let json = serde_json::to_value(&publication).unwrap();

		assert!(json["metadata"]["title"].as_str().is_some());
		assert!(json["metadata"]["identifier"].as_str().is_some());
		assert!(json["metadata"]["belongsTo"]["series"].is_object());

		assert!(publication.links.is_some());
		let links = publication.links.as_ref().unwrap();
		assert!(links.len() >= 2); // At least self and acquisition links

		assert!(json["readingOrder"].is_array());
		let reading_order_json = json["readingOrder"].as_array().unwrap();
		assert_eq!(reading_order_json.len(), 3);

		for page in reading_order_json {
			assert!(page["height"].as_u64().is_some());
			assert!(page["width"].as_u64().is_some());
			assert!(page["href"].as_str().is_some());
		}

		assert!(publication.resources.is_some());
		assert!(publication.toc.is_some());
		assert!(publication.landmarks.is_some());
		assert!(publication.page_list.is_some());
	}

	#[test]
	fn test_links_for_book() {
		let book = mock_book();
		let finalizer = OPDSLinkFinalizer::new("https://example.com".to_string());

		let links = OPDSPublication::links_for_book(&book, &finalizer)
			.expect("Failed to generate links");

		assert_eq!(links.len(), 3);

		// Verify we have self, acquisition, and progression links
		let has_self = links.iter().any(|l| {
			if let OPDSLink::Link(link) = l {
				link.rel
					.as_ref()
					.map(|rel| rel.contains(&OPDSLinkRel::SelfLink))
					.unwrap_or(false)
			} else {
				false
			}
		});
		assert!(has_self);

		let has_acquisition = links.iter().any(|l| {
			if let OPDSLink::Link(link) = l {
				link.rel
					.as_ref()
					.map(|rel| rel.contains(&OPDSLinkRel::Acquisition))
					.unwrap_or(false)
			} else {
				false
			}
		});
		assert!(has_acquisition);
	}

	#[tokio::test]
	async fn test_images_for_book() {
		let book = mock_book();
		let finalizer = OPDSLinkFinalizer::new("https://example.com".to_string());

		let images = OPDSPublication::images_for_book(&book, &finalizer)
			.await
			.expect("Failed to generate images");

		assert_eq!(images.len(), 1);

		let json = serde_json::to_value(&images[0]).unwrap();
		assert!(json["href"]
			.as_str()
			.unwrap()
			.contains("/opds/v2.0/books/1/thumbnail"));
	}

	#[test]
	fn test_default_context() {
		assert_eq!(
			OPDSPublication::default_context(),
			"https://readium.org/webpub-manifest/context.jsonld"
		);
	}
}
