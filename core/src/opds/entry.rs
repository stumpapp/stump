use std::vec;

use prisma_client_rust::chrono::DateTime;
use prisma_client_rust::chrono::{self, FixedOffset};
use urlencoding::encode;
use xml::{writer::XmlEvent, EventWriter};

use crate::error::CoreResult;
use crate::filesystem::media::get_content_types_for_pages;
use crate::{
	opds::link::OpdsStreamLink,
	prisma::{library, media, series},
};

use super::{
	link::{OpdsLink, OpdsLinkRel, OpdsLinkType},
	util,
};

#[derive(Debug)]
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

// FIXME: needs to be a TryFrom for the error handling....
impl From<media::Data> for OpdsEntry {
	fn from(m: media::Data) -> Self {
		let base_url = format!("/opds/v1.2/books/{}", m.id);
		let file_name = format!("{}.{}", m.name, m.extension);
		let file_name_encoded = encode(&file_name);

		let progress_info = m
			.read_progresses()
			.ok()
			.and_then(|progresses| progresses.first());

		let (current_page, last_read_at) = if let Some(progress) = progress_info {
			(Some(progress.page), Some(progress.updated_at))
		} else {
			(None, None)
		};

		let mut target_pages = vec![1];
		if let Some(page) = current_page {
			target_pages.push(page);
		}

		let page_content_types = get_content_types_for_pages(&m.path, target_pages)
			.expect("Failed to get content types for pages");

		let thumbnail_link_type = page_content_types
			.get(&1)
			.expect("Failed to get content type for thumbnail")
			.to_owned();

		let current_page_link_type = if let Some(page) = current_page {
			page_content_types
				.get(&page)
				.expect("Failed to get content type for current page")
				.to_owned()
		} else {
			thumbnail_link_type.to_owned()
		};

		let thumbnail_opds_link_type = OpdsLinkType::try_from(thumbnail_link_type)
			.expect("Failed to convert thumbnail link type to OPDS link type");

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
				OpdsLinkType::Zip,
				OpdsLinkRel::Acquisition,
				format!("{}/file/{}", base_url, file_name_encoded),
			),
		];

		let stream_link = OpdsStreamLink::new(
			m.id.clone(),
			m.pages.to_string(),
			current_page_link_type.to_string(),
			current_page.map(|page| page.to_string()),
			last_read_at.map(|date| date.to_string()),
		);

		let mib = m.size as f64 / (1024.0 * 1024.0);

		let content = match m.description {
			Some(description) => Some(format!(
				"{:.1} MiB - {}<br/><br/>{}",
				mib, m.extension, description
			)),
			None => Some(format!("{:.1} MiB - {}", mib, m.extension)),
		};

		OpdsEntry {
			id: m.id.to_string(),
			title: m.name,
			updated: chrono::Utc::now().into(),
			content,
			links,
			authors: None,
			stream_link: Some(stream_link),
		}
	}
}
