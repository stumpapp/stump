use anyhow::Result;
use xml::{writer::XmlEvent, EventWriter};

use super::util::{self, OpdsEnumStr};

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
    Start,      // start
    Next,       // next
    Thumbnail,  // "http://opds-spec.org/image/thumbnail"
    PageStream, // "http://vaemendis.net/opds-pse/stream"
}

impl OpdsEnumStr for OpdsLinkRel {
    fn as_str(&self) -> &'static str {
        match self {
            OpdsLinkRel::ItSelf => "self",
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
    pub fn write(&self, writer: &mut EventWriter<Vec<u8>>) -> Result<()> {
        writer.write(xml::writer::XmlEvent::start_element("link"))?;

        util::write_xml_element("type", self.link_type.as_str(), writer)?;
        util::write_xml_element("rel", self.rel.as_str(), writer)?;
        util::write_xml_element("href", &self.href, writer)?;

        writer.write(XmlEvent::end_element())?; // end of link
        Ok(())
    }
}
