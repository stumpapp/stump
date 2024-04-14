//! This module defines the [OpdsEntry] struct for representing an OPDS catalogue entry
//! as specified at https://specs.opds.io/opds-1.2#5-opds-catalog-entry-documents

use std::collections::HashMap;
use std::path::PathBuf;
use std::vec;

use prisma_client_rust::chrono::DateTime;
use prisma_client_rust::chrono::{self, FixedOffset};
use urlencoding::encode;
use xml::{writer::XmlEvent, EventWriter};

use crate::db::entity::MediaMetadata;
use crate::error::CoreResult;
use crate::filesystem::media::get_content_types_for_pages;
use crate::filesystem::{ContentType, FileParts, PathUtils};
use crate::{
	opds::link::OpdsStreamLink,
	prisma::{library, media, series},
};

use super::{
	link::{OpdsLink, OpdsLinkRel, OpdsLinkType},
	util,
};

#[derive(Debug)]
/// A struct for representing an OPDS catalogue entry as specified at
/// https://specs.opds.io/opds-1.2#5-opds-catalog-entry-documents
pub struct OpdsEntry {
	id: String,
	updated: DateTime<FixedOffset>,
	title: String,
	content: Option<String>,
	authors: Option<Vec<String>>,
	links: Vec<OpdsLink>,
	stream_link: Option<OpdsStreamLink>,
}

impl OpdsEntry {
	pub fn new(
		id: String,
		updated: DateTime<FixedOffset>,
		title: String,
		content: Option<String>,
		authors: Option<Vec<String>>,
		links: Option<Vec<OpdsLink>>,
		stream_link: Option<OpdsStreamLink>,
	) -> Self {
		let links = match links {
			Some(links) => links,
			None => vec![],
		};

		Self {
			id,
			updated,
			title,
			content,
			authors,
			links,
			stream_link,
		}
	}

	pub fn write(&self, writer: &mut EventWriter<Vec<u8>>) -> CoreResult<()> {
		writer.write(XmlEvent::start_element("entry"))?;

		util::write_xml_element("title", self.title.as_str(), writer)?;
		util::write_xml_element("id", self.id.as_str(), writer)?;
		util::write_xml_element("updated", &self.updated.to_rfc3339(), writer)?;

		if let Some(content) = self.get_content() {
			util::write_xml_element("content", content.as_str(), writer)?;
		} else {
			writer.write(XmlEvent::start_element("content"))?;
			writer.write(XmlEvent::end_element())?;
		}

		if let Some(authors) = &self.authors {
			writer.write(XmlEvent::start_element("author"))?;

			for author in authors {
				util::write_xml_element("name", author.as_str(), writer)?;
			}

			writer.write(XmlEvent::end_element())?; // end of author
		}

		for link in &self.links {
			link.write(writer)?;
		}

		if let Some(stream_link) = &self.stream_link {
			stream_link.write(writer)?;
		}

		writer.write(XmlEvent::end_element())?; // end of entry

		Ok(())
	}

	fn get_content(&self) -> Option<String> {
		self.content
			.as_ref()
			.map(|content| content.clone().replace('\n', "<br/>"))
	}
}

impl From<library::Data> for OpdsEntry {
	fn from(l: library::Data) -> Self {
		let mut links = Vec::new();

		let nav_link = OpdsLink::new(
			OpdsLinkType::Navigation,
			OpdsLinkRel::Subsection,
			format!("/opds/v1.2/libraries/{}", l.id),
		);

		links.push(nav_link);

		OpdsEntry {
			id: l.id,
			updated: l.updated_at,
			title: l.name,
			content: l.description,
			authors: None,
			links,
			stream_link: None,
		}
	}
}

impl From<series::Data> for OpdsEntry {
	fn from(s: series::Data) -> Self {
		let mut links = Vec::new();

		let nav_link = OpdsLink::new(
			OpdsLinkType::Navigation,
			OpdsLinkRel::Subsection,
			format!("/opds/v1.2/series/{}", s.id),
		);

		links.push(nav_link);

		OpdsEntry {
			id: s.id.to_string(),
			updated: s.updated_at,
			title: s.name,
			content: s.description,
			authors: None,
			links,
			stream_link: None,
		}
	}
}

// TODO: I was panicing here on my hosted server, and added additional safe guards. I need to check what was happening
// once these changes are deployed and I can see the logs on my server.

impl From<media::Data> for OpdsEntry {
	fn from(value: media::Data) -> Self {
		tracing::trace!(book = ?value, "Converting book to OPDS entry");

		let base_url = format!("/opds/v1.2/books/{}", value.id);

		let path_buf = PathBuf::from(value.path.as_str());
		let FileParts { file_name, .. } = path_buf.file_parts();
		let file_name_encoded = encode(&file_name);

		let progress_info = value
			.read_progresses()
			.ok()
			.and_then(|progresses| progresses.first());

		let (current_page, last_read_at) = if let Some(progress) = progress_info {
			(Some(progress.page), Some(progress.updated_at))
		} else {
			(None, None)
		};

		let target_pages = if let Some(page) = current_page {
			vec![1, page]
		} else {
			vec![1]
		};

		let page_content_types = get_content_types_for_pages(&value.path, target_pages)
			.unwrap_or_else(|error| {
				tracing::error!(error = ?error, "Failed to get content types for pages");
				HashMap::default()
			});
		tracing::trace!(?page_content_types, "Got page content types");

		let thumbnail_link_type = page_content_types
			.get(&1)
			.unwrap_or_else(|| {
				tracing::error!("Failed to get content type for thumbnail");
				&ContentType::JPEG
			})
			.to_owned();

		let current_page_link_type = match current_page {
			Some(page) if page < value.pages => page_content_types
				.get(&page)
				.unwrap_or_else(|| {
					tracing::error!("Failed to get content type for current page");
					&ContentType::JPEG
				})
				.to_owned(),
			Some(page) => {
				tracing::warn!(current_page=?page, book_pages=?value.pages, "Current page is out of bounds!");
				thumbnail_link_type.to_owned()
			},
			_ => thumbnail_link_type.to_owned(),
		};

		let thumbnail_opds_link_type = OpdsLinkType::try_from(thumbnail_link_type)
		.unwrap_or_else(|error| {
			tracing::error!(error = ?error, ?thumbnail_link_type, "Failed to convert thumbnail content type to OPDS link type");
			OpdsLinkType::ImageJpeg
		});

		let entry_file_acquisition_link_type =
			OpdsLinkType::from_extension(&value.extension).unwrap_or_else(|| {
				tracing::error!(?value.extension, "Failed to convert file extension to OPDS link type");
				OpdsLinkType::Zip
			});

		let links = vec![
			OpdsLink::new(
				thumbnail_opds_link_type,
				OpdsLinkRel::Thumbnail,
				format!("{}/thumbnail", base_url),
			),
			OpdsLink::new(
				thumbnail_opds_link_type,
				OpdsLinkRel::Image,
				format!("{}/pages/1", base_url),
			),
			OpdsLink::new(
				entry_file_acquisition_link_type,
				OpdsLinkRel::Acquisition,
				format!("{}/file/{}", base_url, file_name_encoded),
			),
		];

		let stream_link = OpdsStreamLink::new(
			value.id.clone(),
			value.pages.to_string(),
			current_page_link_type.to_string(),
			current_page.map(|page| page.to_string()),
			last_read_at.map(|date| date.to_string()),
		);

		let mib = value.size as f64 / (1024.0 * 1024.0);

		let metadata = value
			.metadata()
			.ok()
			.flatten()
			.map(|meta| MediaMetadata::from(meta.to_owned()));
		let description = metadata
			.as_ref()
			.and_then(|m| m.summary.as_ref())
			.map(|s| s.to_owned());

		let content = match description {
			Some(s) => Some(format!(
				"{:.1} MiB - {}<br/><br/>{}",
				mib, value.extension, s
			)),
			None => Some(format!("{:.1} MiB - {}", mib, value.extension)),
		};

		OpdsEntry {
			id: value.id.to_string(),
			title: value.name,
			updated: chrono::Utc::now().into(),
			content,
			links,
			authors: None,
			stream_link: Some(stream_link),
		}
	}
}

#[cfg(test)]
mod tests {
	use std::str::FromStr;

	use super::*;
	use crate::opds::tests::normalize_xml;

	#[test]
	fn test_opds_entry() {
		let links = vec![
			OpdsLink::new(
				OpdsLinkType::ImagePng,
				OpdsLinkRel::Image,
				"/covers/4561.lrg.png".to_string(),
			),
			OpdsLink::new(
				OpdsLinkType::ImageGif,
				OpdsLinkRel::Thumbnail,
				"/covers/4561.thmb.gif".to_string(),
			),
		];

		let stream_link = OpdsStreamLink::new(
			"123".to_string(),
			"35".to_string(),
			"image/jpeg".to_string(),
			Some("10".to_string()),
			Some("2010-01-10T10:01:11Z".to_string()),
		);

		let updated = DateTime::from_str("2010-01-10T10:01:11Z").unwrap();
		let entry = OpdsEntry::new(
			"urn:uuid:6409a00b-7bf2-405e-826c-3fdff0fd0734".to_string(),
			updated,
			"Modern Online Philately".to_string(),
			Some("The definitive reference for the web-curious philatelist.".to_string()),
			Some(vec!["Harold McGee".to_string()]),
			Some(links),
			Some(stream_link),
		);

		let mut writer = EventWriter::new(Vec::new());
		entry.write(&mut writer).unwrap();

		let result = String::from_utf8(writer.into_inner()).unwrap();
		let expected_result = normalize_xml(
			r#"
			<?xml version="1.0" encoding="utf-8"?>
			<entry>
				<title>Modern Online Philately</title>
				<id>urn:uuid:6409a00b-7bf2-405e-826c-3fdff0fd0734</id>
				<updated>2010-01-10T10:01:11+00:00</updated>
				<content>The definitive reference for the web-curious philatelist.</content>
				<author>
					<name>Harold McGee</name>
				</author>
				<link type="image/png" 
							rel="http://opds-spec.org/image"     
							href="/covers/4561.lrg.png" />
				<link type="image/gif"
							rel="http://opds-spec.org/image/thumbnail"
							href="/covers/4561.thmb.gif" />
				<link href="/opds/v1.2/books/123/pages/{pageNumber}?zero_based=true"
							type="image/jpeg"
							rel="http://vaemendis.net/opds-pse/stream"
							pse:count="35"
							pse:lastRead="10"
							pse:lastReadDate="2010-01-10T10:01:11Z"
				/>
			</entry>
			"#,
		);

		assert_eq!(result, expected_result);
	}
}
