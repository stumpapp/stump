use anyhow::Result;
use xml::{writer::XmlEvent, EventWriter};

use super::util;

pub enum OpdsLinkType {
    Acquisition, // "application/atom+xml;profile=opds-catalog;kind=acquisition",
    Image,       // "image/jpeg",
    Navigation,  // "application/atom+xml;profile=opds-catalog;kind=navigation",
    OctetStream, // "application/octet-stream",
}

impl From<OpdsLinkType> for String {
    fn from(link_type: OpdsLinkType) -> Self {
        match link_type {
            OpdsLinkType::Acquisition => {
                "application/atom+xml;profile=opds-catalog;kind=acquisition".to_string()
            }
            OpdsLinkType::Image => "image/jpeg".to_string(),
            OpdsLinkType::Navigation => {
                "application/atom+xml;profile=opds-catalog;kind=navigation".to_string()
            }
            OpdsLinkType::OctetStream => "application/octet-stream".to_string(),
        }
    }
}

pub struct OpdsLink {
    pub link_type: String,
    pub rel: String,
    pub href: String,
}

impl OpdsLink {
    pub fn write(&self, writer: &mut EventWriter<Vec<u8>>) -> Result<()> {
        writer.write(xml::writer::XmlEvent::start_element("link"))?;

        util::write_xml_element("type", &self.link_type, writer)?;
        util::write_xml_element("rel", &self.rel, writer)?;
        util::write_xml_element("href", &self.href, writer)?;

        writer.write(XmlEvent::end_element())?; // end of link
        Ok(())
    }
}
