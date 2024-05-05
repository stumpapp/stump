//! This module defines a struct,[OpdsFeed], for representing an OPDS catalogue feed document
//! as specified at https://specs.opds.io/opds-1.2#2-opds-catalog-feed-documents

use crate::{
	error::CoreError,
	opds::link::OpdsLink,
	prisma::{library, series},
};
use prisma_client_rust::chrono::{self, DateTime, Utc};
use tracing::warn;
use xml::{writer::XmlEvent, EventWriter};

use super::{
	author::StumpAuthor,
	entry::OpdsEntry,
	link::{OpdsLinkRel, OpdsLinkType},
	util,
};

#[derive(Debug)]
/// A struct for representing an OPDS catalogue feed document as specified at
///  https://specs.opds.io/opds-1.2#2-opds-catalog-feed-documents
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

	pub fn paginated<T>(
		id: &str,
		title: &str,
		href_postfix: &str,
		data: Vec<T>,
		page: i64,
		count: i64,
	) -> OpdsFeed
	where
		OpdsEntry: From<T>,
	{
		(
			id.to_string(),
			title.to_string(),
			href_postfix.to_string(),
			data,
			page,
			count,
		)
			.into()
	}

	/// Build an xml string from the feed.
	pub fn build(&self) -> Result<String, CoreError> {
		self.build_with_datetime(&chrono::Utc::now())
	}

	/// A helper function that builds an xml string from a feed using the [DateTime] object provided
	/// as the value of the <updated> element. Because private functions are accessible during tests,
	/// it also provides a way to more easily check the resulting value in tests.
	fn build_with_datetime(&self, updated: &DateTime<Utc>) -> Result<String, CoreError> {
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
		util::write_xml_element("updated", &updated.to_rfc3339(), &mut writer)?;

		let author = StumpAuthor::default();
		author.write(&mut writer)?;

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
			Ok(series) => series.iter().cloned().map(OpdsEntry::from).collect(),
			Err(e) => {
				warn!("Failed to get series for library {}: {}", id, e);
				vec![]
			},
		};

		Self::new(id, title, Some(links), entries)
	}
}

impl From<(library::Data, i64, i64)> for OpdsFeed {
	fn from((library, page, count): (library::Data, i64, i64)) -> Self {
		let id = library.id.clone();
		let title = library.name.clone();

		let href_postfix = format!("libraries/{}", &id);

		let data = library.series().unwrap_or(&Vec::new()).to_owned();

		(id, title, href_postfix, data, page, count).into()

		// let mut links = vec![
		// 	OpdsLink::new(
		// 		OpdsLinkType::Navigation,
		// 		OpdsLinkRel::ItSelf,
		// 		format!("/opds/v1.2/libraries/{}", id),
		// 	),
		// 	OpdsLink::new(
		// 		OpdsLinkType::Navigation,
		// 		OpdsLinkRel::Start,
		// 		"/opds/v1.2/catalog".to_string(),
		// 	),
		// ];

		// let entries = library
		// 	.series()
		// 	.unwrap_or(Vec::<series::Data>::new().as_ref())
		// 	.to_owned()
		// 	.into_iter()
		// 	.map(OpdsEntry::from)
		// 	.collect::<Vec<_>>();

		// if page > 0 {
		// 	links.push(OpdsLink {
		// 		link_type: OpdsLinkType::Navigation,
		// 		rel: OpdsLinkRel::Previous,
		// 		href: format!("/opds/v1.2/libraries?page={}", page - 1),
		// 	});
		// }

		// let total_pages = (count as f32 / 20.0).ceil() as u32;

		// if page < total_pages as u32 && entries.len() == 20 {
		// 	links.push(OpdsLink {
		// 		link_type: OpdsLinkType::Navigation,
		// 		rel: OpdsLinkRel::Next,
		// 		href: format!("/opds/v1.2/libraries?page={}", page + 1),
		// 	});
		// }

		// OpdsFeed::new(id, title, Some(links), entries)
	}
}

impl From<(String, Vec<series::Data>, i64, i64)> for OpdsFeed {
	/// Used in /opds/series?page={page}, converting the raw Vector of series into an OPDS feed.
	/// The page URL param is also passed in, and is used when generating the OPDS links.
	fn from((title, series, page, count): (String, Vec<series::Data>, i64, i64)) -> Self {
		let entries = series.into_iter().map(OpdsEntry::from).collect::<Vec<_>>();

		let mut links = vec![
			OpdsLink {
				link_type: OpdsLinkType::Navigation,
				rel: OpdsLinkRel::ItSelf,
				href: String::from("/opds/v1.2/series"),
			},
			OpdsLink {
				link_type: OpdsLinkType::Navigation,
				rel: OpdsLinkRel::Start,
				href: String::from("/opds/v1.2/catalog"),
			},
		];

		if page > 0 {
			links.push(OpdsLink {
				link_type: OpdsLinkType::Navigation,
				rel: OpdsLinkRel::Previous,
				href: format!("/opds/v1.2/series?page={}", page - 1),
			});
		}

		// TODO: this 20.0 is the page size, which I might make dynamic for OPDS routes... but
		// not sure..
		let total_pages = (count as f32 / 20.0).ceil() as u32;

		if page < total_pages as i64 && entries.len() == 20 {
			links.push(OpdsLink {
				link_type: OpdsLinkType::Navigation,
				rel: OpdsLinkRel::Next,
				href: format!("/opds/v1.2/series?page={}", page + 1),
			});
		}

		OpdsFeed::new("root".to_string(), title, Some(links), entries)
	}
}

impl<T> From<(String, String, String, Vec<T>, i64, i64)> for OpdsFeed
where
	OpdsEntry: From<T>,
{
	fn from(tuple: (String, String, String, Vec<T>, i64, i64)) -> OpdsFeed {
		let (id, title, href_postfix, data, page, count) = tuple;

		let entries = data.into_iter().map(OpdsEntry::from).collect::<Vec<_>>();

		let mut links = vec![
			OpdsLink {
				link_type: OpdsLinkType::Navigation,
				rel: OpdsLinkRel::ItSelf,
				href: format!("/opds/v1.2/{}", href_postfix),
			},
			OpdsLink {
				link_type: OpdsLinkType::Navigation,
				rel: OpdsLinkRel::Start,
				href: "/opds/v1.2/catalog".into(),
			},
		];

		if page > 0 {
			links.push(OpdsLink {
				link_type: OpdsLinkType::Navigation,
				rel: OpdsLinkRel::Previous,
				href: format!("/opds/v1.2/{}?page={}", href_postfix, page - 1),
			});
		}

		// TODO: this 20.0 is the page size, which I might make dynamic for OPDS routes... but
		// not sure..
		let total_pages = (count as f32 / 20.0).ceil() as u32;

		if page < total_pages as i64 && entries.len() == 20 {
			links.push(OpdsLink {
				link_type: OpdsLinkType::Navigation,
				rel: OpdsLinkRel::Next,
				href: format!("/opds/v1.2/{}?page={}", href_postfix, page + 1),
			});
		}

		OpdsFeed::new(id, title, Some(links), entries)
	}
}

#[cfg(test)]
mod tests {
	use std::str::FromStr;

	use super::*;
	use crate::opds::tests::normalize_xml;

	#[test]
	fn test_opds_feed() {
		let updated = DateTime::from_str("2010-01-10T10:01:11Z").unwrap();
		let entry = OpdsEntry::new(
			"urn:uuid:6409a00b-7bf2-405e-826c-3fdff0fd0734".to_string(),
			updated,
			"Modern Online Philately".to_string(),
			None,
			None,
			None,
			None,
		);

		let feed = OpdsFeed::new(
			"feed_id".to_string(),
			"Feed Title".to_string(),
			None,
			vec![entry],
		);

		// We test using the private build_with_datetime method to ensure that we
		// know value of the "updated" element.
		let now = chrono::Utc::now();
		let result = feed.build_with_datetime(&now).unwrap();
		// Because the updated date is set at build time, we need to dynamically insert it
		let template_expected_result = normalize_xml(
			r#"
			<?xml version="1.0" encoding="utf-8"?>
			<feed xmlns="http://www.w3.org/2005/Atom" 
						xmlns:opds="http://opds-spec.org/2010/catalog" 
						xmlns:pse="http://vaemendis.net/opds-pse/ns">
				<id>feed_id</id>
				<title>Feed Title</title>
				<updated>{{{INSERT}}}</updated>
				<author>
					<name>Stump</name>
					<uri>https://github.com/stumpapp/stump</uri>
				</author>
				<entry>
					<title>Modern Online Philately</title>
					<id>urn:uuid:6409a00b-7bf2-405e-826c-3fdff0fd0734</id>
					<updated>2010-01-10T10:01:11+00:00</updated>
					<content />
				</entry>
			</feed>
			"#,
		);
		// We insert the current time into the template so that we test the correct result
		let now_str = now.to_rfc3339();
		let expected_result = template_expected_result.replace("{{{INSERT}}}", &now_str);

		assert_eq!(result, expected_result);
	}
}
