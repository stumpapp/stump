use anyhow::Result;
use xml::{writer::XmlEvent, EventWriter};

use super::util::OpdsEnumStr;

#[derive(Debug)]
pub enum OpdsLinkType {
    Acquisition, // "application/atom+xml;profile=opds-catalog;kind=acquisition",
    Image,       // "image/jpeg",
    Navigation,  // "application/atom+xml;profile=opds-catalog;kind=navigation",
    OctetStream, // "application/octet-stream",
    Zip,         // application/zip
}

impl OpdsEnumStr for OpdsLinkType {
    fn as_str(&self) -> &'static str {
        match self {
            OpdsLinkType::Acquisition => {
                "application/atom+xml;profile=opds-catalog;kind=acquisition"
            }
            OpdsLinkType::Image => "image/jpeg",
            OpdsLinkType::Navigation => "application/atom+xml;profile=opds-catalog;kind=navigation",
            OpdsLinkType::OctetStream => "application/octet-stream",
            OpdsLinkType::Zip => "application/zip",
        }
    }
}

#[derive(Debug)]
pub enum OpdsLinkRel {
    ItSelf,     // self
    Subsection, // "subsection",
    Start,      // start
    Next,       // next
    Thumbnail,  // "http://opds-spec.org/image/thumbnail"
    PageStream, // "http://vaemendis.net/opds-pse/stream"
}

impl OpdsEnumStr for OpdsLinkRel {
    fn as_str(&self) -> &'static str {
        match self {
            OpdsLinkRel::ItSelf => "self",
            OpdsLinkRel::Subsection => "subsection",
            OpdsLinkRel::Start => "start",
            OpdsLinkRel::Next => "next",
            OpdsLinkRel::Thumbnail => "http://opds-spec.org/image/thumbnail",
            OpdsLinkRel::PageStream => "http://vaemendis.net/opds-pse/stream",
        }
    }
}

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

    pub fn write(&self, writer: &mut EventWriter<Vec<u8>>) -> Result<()> {
        let link = XmlEvent::start_element("link")
            .attr("type", self.link_type.as_str())
            .attr("rel", self.rel.as_str())
            .attr("href", &self.href);

        writer.write(link)?;
        writer.write(XmlEvent::end_element())?; // end of link
        Ok(())
    }
}
