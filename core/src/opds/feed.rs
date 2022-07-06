// use crate::opds::author::StumpAuthor;
use crate::{opds::link::OpdsLink, prisma::library};
use anyhow::Result;
use prisma_client_rust::chrono;
use xml::{writer::XmlEvent, EventWriter};

use super::{
	entry::OpdsEntry,
	link::{OpdsLinkRel, OpdsLinkType},
	models::OpdsSeries,
	util,
};

#[derive(Debug)]
pub struct OpdsFeed {
	pub id: String,
	pub title: String,
	pub entries: Vec<OpdsEntry>,
	pub links: Option<Vec<OpdsLink>>,
}

impl OpdsFeed {
	pub fn new(
		id: String,
		title: String,
		links: Option<Vec<OpdsLink>>,
		entries: Vec<OpdsEntry>,
	) -> Self {
		Self {
			id,
			title,
			entries,
			links,
		}
	}

	/// Build an xml string from the feed.
	pub fn build(&self) -> Result<String> {
		let raw = Vec::new();
		let mut writer = EventWriter::new(raw);

		writer.write(
			xml::writer::XmlEvent::start_element("feed")
				.default_ns("http://www.w3.org/2005/Atom")
				.ns("opds", "http://opds-spec.org/2010/catalog")
				.ns("pse", "http://vaemendis.net/opds-pse/ns"),
		)?;

		util::write_xml_element("id", &self.id, &mut writer)?;
		util::write_xml_element("title", &self.title, &mut writer)?;
		util::write_xml_element(
			"updated",
			&chrono::Utc::now().to_rfc3339(),
			&mut writer,
		)?;

		if let Some(links) = &self.links {
			for link in links {
				link.write(&mut writer)?;
			}
		}

		for entry in &self.entries {
			entry.write(&mut writer)?;
		}

		writer.write(XmlEvent::end_element())?; // end of feed

		Ok(String::from_utf8(writer.into_inner())?)
	}
}

// TODO: impl feeds for search results

impl From<OpdsSeries> for OpdsFeed {
	fn from(series: OpdsSeries) -> Self {
		let id = series.id;
		let title = series.name;

		// // TODO: use this
		// let author = StumpAuthor::new(
		//     "Stump".to_string(),
		//     Some("https://github.com/aaronleopold/stump".to_string()),
		// );

		let mut links = vec![
			OpdsLink::new(
				OpdsLinkType::Navigation,
				OpdsLinkRel::ItSelf,
				format!("/opds/v1.2/series/{}", id),
			),
			OpdsLink::new(
				OpdsLinkType::Navigation,
				OpdsLinkRel::Start,
				"/opds/v1.2/catalog".to_string(),
			),
		];

		let prev_link = match series.current_page {
			0 => None,
			1 => Some(format!("/opds/v1.2/series/{}", id)),
			_ => Some(format!(
				"/opds/v1.2/series/{}?page={}",
				id,
				series.current_page - 1
			)),
		};

		if let Some(prev_link) = prev_link {
			links.push(OpdsLink::new(
				OpdsLinkType::Navigation,
				OpdsLinkRel::Previous,
				prev_link,
			));
		}

		if let Some(next_page) = series.next_page {
			links.push(OpdsLink::new(
				OpdsLinkType::Navigation,
				OpdsLinkRel::Next,
				format!("/opds/v1.2/series/{}?page={}", id, next_page),
			));
		}

		let entries = series.media.into_iter().map(OpdsEntry::from).collect();

		Self::new(id, title, Some(links), entries)
	}
}

impl From<library::Data> for OpdsFeed {
	fn from(library: library::Data) -> Self {
		let id = library.id.clone();
		let title = library.name.clone();

		let links = vec![
			OpdsLink::new(
				OpdsLinkType::Navigation,
				OpdsLinkRel::ItSelf,
				format!("/opds/v1.2/libraries/{}", id),
			),
			OpdsLink::new(
				OpdsLinkType::Navigation,
				OpdsLinkRel::Start,
				"/opds/v1.2/catalog".to_string(),
			),
		];

		let entries = match library.series() {
			Ok(series) => series.to_owned().into_iter().map(OpdsEntry::from).collect(),
			Err(e) => {
				log::warn!("Failed to get series for library {}: {}", id, e);
				vec![]
			},
		};

		Self::new(id, title, Some(links), entries)
	}
}
