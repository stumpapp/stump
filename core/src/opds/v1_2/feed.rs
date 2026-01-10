//! This module defines a struct,[`OpdsFeed`], for representing an OPDS catalogue feed document
//! as specified at https://specs.opds.io/opds-1.2#2-opds-catalog-feed-documents

use std::collections::HashMap;

use crate::{error::CoreError, opds::v1_2::link::OpdsLink, utils::chain_optional_iter};
use chrono::{DateTime, Utc};
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

	/// Build an xml string from the feed.
	pub fn build(&self) -> Result<String, CoreError> {
		self.build_with_datetime(&Utc::now())
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

pub struct OPDSFeedBuilder {
	api_key: Option<String>,
}

#[derive(Debug, Default)]
pub struct OPDSFeedBuilderPageParams {
	pub page: u64,
	pub count: u64,
}

#[derive(Debug, Default)]
pub struct OPDSFeedBuilderParams {
	pub id: String,
	pub title: String,
	pub entries: Vec<OpdsEntry>,
	pub href_postfix: String,
	pub page_params: Option<OPDSFeedBuilderPageParams>,
	pub search: Option<String>,
}

impl OPDSFeedBuilder {
	pub fn new(api_key: Option<String>) -> Self {
		Self { api_key }
	}

	fn format_url(&self, path: &str) -> String {
		if let Some(ref api_key) = self.api_key {
			format!("/opds/{}/v1.2/{}", api_key, path)
		} else {
			format!("/opds/v1.2/{}", path)
		}
	}

	fn format_params(&self, path: &str, params: HashMap<String, String>) -> String {
		let mut url = self.format_url(path);
		if !params.is_empty() {
			url.push('?');
			for (idx, (key, value)) in params.iter().enumerate() {
				if idx == params.len() - 1 {
					url.push_str(&format!("{}={}", key, value));
				} else {
					url.push_str(&format!("{}={}&", key, value));
				}
			}
		}
		url
	}

	pub fn paginated(
		self,
		OPDSFeedBuilderParams {
			id,
			title,
			entries,
			href_postfix,
			page_params,
			search,
		}: OPDSFeedBuilderParams,
	) -> Result<OpdsFeed, CoreError> {
		let OPDSFeedBuilderPageParams { page, count } = page_params.unwrap_or_default();

		let search_params = search
			.as_ref()
			.map(|s| ("search".to_string(), s.to_string()));

		let this_params = chain_optional_iter(
			[("page".to_string(), page.to_string())],
			[search_params.clone()],
		)
		.into_iter()
		.collect::<HashMap<_, _>>();

		let mut links = vec![
			OpdsLink::new(
				OpdsLinkType::Navigation,
				OpdsLinkRel::ItSelf,
				self.format_params(&href_postfix, this_params),
			),
			OpdsLink::new(
				OpdsLinkType::Navigation,
				OpdsLinkRel::Start,
				self.format_url("catalog"),
			),
		];

		if page > 0 {
			let next_params = chain_optional_iter(
				[("page".to_string(), (page - 1).to_string())],
				[search_params.clone()],
			)
			.into_iter()
			.collect::<HashMap<_, _>>();

			links.push(OpdsLink {
				link_type: OpdsLinkType::Navigation,
				rel: OpdsLinkRel::Previous,
				href: self.format_params(&href_postfix, next_params),
			});
		}

		let total_pages = (count as f32 / 20.0).ceil() as u32;

		if page < total_pages as u64 && entries.len() == 20 {
			let next_params = chain_optional_iter(
				[("page".to_string(), (page + 1).to_string())],
				[search_params.clone()],
			)
			.into_iter()
			.collect::<HashMap<_, _>>();

			links.push(OpdsLink {
				link_type: OpdsLinkType::Navigation,
				rel: OpdsLinkRel::Next,
				href: self.format_params(&href_postfix, next_params),
			});
		}

		Ok(OpdsFeed::new(
			id.to_string(),
			title.to_string(),
			Some(links),
			entries,
		))
	}

	pub fn unpaged(
		self,
		OPDSFeedBuilderParams {
			id,
			title,
			entries,
			href_postfix,
			search,
			..
		}: OPDSFeedBuilderParams,
	) -> Result<OpdsFeed, CoreError> {
		let search_params =
			chain_optional_iter([], [search.map(|s| ("search".to_string(), s.clone()))])
				.into_iter()
				.collect::<HashMap<_, _>>();

		let links = vec![
			OpdsLink::new(
				OpdsLinkType::Navigation,
				OpdsLinkRel::ItSelf,
				self.format_params(&href_postfix, search_params),
			),
			OpdsLink::new(
				OpdsLinkType::Navigation,
				OpdsLinkRel::Start,
				self.format_url("catalog"),
			),
		];

		Ok(OpdsFeed::new(
			id.to_string(),
			title.to_string(),
			Some(links),
			entries,
		))
	}
}

#[cfg(test)]
mod tests {
	use std::str::FromStr;

	use chrono::DateTime;

	use super::*;
	use crate::opds::v1_2::tests::normalize_xml;

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
			<?xml version="1.0" encoding="UTF-8"?>
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
