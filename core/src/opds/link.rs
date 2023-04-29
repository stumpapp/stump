use xml::{writer::XmlEvent, EventWriter};

use crate::{error::CoreResult, filesystem::ContentType};

use super::util::OpdsEnumStr;

#[derive(Debug, Clone, Copy)]
pub enum OpdsLinkType {
	Acquisition, // "application/atom+xml;profile=opds-catalog;kind=acquisition",
	ImageJpeg,   // "image/jpeg",
	ImagePng,    // "image/png",
	ImageGif,    // "image/gif",
	Navigation,  // "application/atom+xml;profile=opds-catalog;kind=navigation",
	OctetStream, // "application/octet-stream",
	Zip,         // "application/zip"
	Epub,        // "application/epub+zip"
	Search,      // "application/opensearchdescription+xml"
}

impl TryFrom<ContentType> for OpdsLinkType {
	type Error = String;

	fn try_from(content_type: ContentType) -> Result<Self, Self::Error> {
		match content_type {
			ContentType::JPEG => Ok(OpdsLinkType::ImageJpeg),
			ContentType::PNG => Ok(OpdsLinkType::ImagePng),
			ContentType::GIF => Ok(OpdsLinkType::ImageGif),
			_ => Err(format!("Unsupported content type: {}", content_type)),
		}
	}
}

impl OpdsEnumStr for OpdsLinkType {
	fn as_str(&self) -> &'static str {
		match self {
			OpdsLinkType::Acquisition => {
				"application/atom+xml;profile=opds-catalog;kind=acquisition"
			},
			OpdsLinkType::ImageJpeg => "image/jpeg",
			OpdsLinkType::ImagePng => "image/png",
			OpdsLinkType::ImageGif => "image/gif",
			OpdsLinkType::Navigation => {
				"application/atom+xml;profile=opds-catalog;kind=navigation"
			},
			OpdsLinkType::OctetStream => "application/octet-stream",
			OpdsLinkType::Zip => "application/zip",
			OpdsLinkType::Epub => "application/epub+zip",
			OpdsLinkType::Search => "application/opensearchdescription+xml",
		}
	}
}

#[derive(Debug)]
pub enum OpdsLinkRel {
	ItSelf,      // self
	Subsection,  // "subsection",
	Acquisition, // "http://opds-spec.org/acquisition",
	Start,       // start
	Next,        // next
	Previous,    // previous
	Thumbnail,   // "http://opds-spec.org/image/thumbnail"
	Image,       // "http://opds-spec.org/image"
	PageStream,  // "http://vaemendis.net/opds-pse/stream"
	Search,      // "search"
}

impl OpdsEnumStr for OpdsLinkRel {
	fn as_str(&self) -> &'static str {
		match self {
			OpdsLinkRel::ItSelf => "self",
			OpdsLinkRel::Subsection => "subsection",
			OpdsLinkRel::Acquisition => "http://opds-spec.org/acquisition",
			OpdsLinkRel::Start => "start",
			OpdsLinkRel::Next => "next",
			OpdsLinkRel::Previous => "previous",
			OpdsLinkRel::Thumbnail => "http://opds-spec.org/image/thumbnail",
			OpdsLinkRel::Image => "http://opds-spec.org/image",
			OpdsLinkRel::PageStream => "http://vaemendis.net/opds-pse/stream",
			OpdsLinkRel::Search => "search",
		}
	}
}

// TODO: this struct needs to be restructured.
// I need to be able to output the following:
// <link xmlns:wstxns3="http://vaemendis.net/opds-pse/ns" href="/opds/v1.2/books/<id>/pages/{pageNumber}?zero_based=true" wstxns3:count="309" type="image/jpeg" rel="http://vaemendis.net/opds-pse/stream"/>

#[derive(Debug)]
pub struct OpdsLink {
	pub link_type: OpdsLinkType,
	pub rel: OpdsLinkRel,
	pub href: String,
}

impl OpdsLink {
	pub fn new(link_type: OpdsLinkType, rel: OpdsLinkRel, href: String) -> Self {
		Self {
			link_type,
			rel,
			href,
		}
	}

	pub fn write(&self, writer: &mut EventWriter<Vec<u8>>) -> CoreResult<()> {
		let link = XmlEvent::start_element("link")
			.attr("type", self.link_type.as_str())
			.attr("rel", self.rel.as_str())
			.attr("href", &self.href);

		writer.write(link)?;
		writer.write(XmlEvent::end_element())?; // end of link
		Ok(())
	}
}

// don't love this solution, but it works for now.
#[derive(Debug)]
pub struct OpdsStreamLink {
	pub book_id: String,
	pub count: String,
	pub mime_type: String,
	pub last_read: Option<String>,
	pub last_read_date: Option<String>,
}

impl OpdsStreamLink {
	pub fn new(
		book_id: String,
		count: String,
		mime_type: String,
		last_read: Option<String>,
		last_read_date: Option<String>,
	) -> Self {
		Self {
			book_id,
			count,
			mime_type,
			last_read,
			last_read_date,
		}
	}

	pub fn write(&self, writer: &mut EventWriter<Vec<u8>>) -> CoreResult<()> {
		let href = format!(
			"/opds/v1.2/books/{}/pages/{{pageNumber}}?zero_based=true",
			self.book_id
		);

		let mut link = XmlEvent::start_element("link")
			.attr("href", href.as_str())
			.attr("type", &self.mime_type)
			.attr("rel", "http://vaemendis.net/opds-pse/stream")
			// .attr("xmlns:pse", "http://vaemendis.net/opds-pse/ns")
			.attr("pse:count", &self.count);

		if let Some(last_read) = &self.last_read {
			link = link.attr("wstxns1:lastRead", last_read);
		}

		if let Some(last_read_date) = &self.last_read_date {
			link = link.attr("wstxns1:lastReadDate", last_read_date);
		}

		writer.write(link)?;
		writer.write(XmlEvent::end_element())?; // end of link
		Ok(())
	}
}
