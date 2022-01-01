use anyhow::Result;
use xml::{writer::XmlEvent, EventWriter};

use super::{entry::OpdsEntry, util};

#[derive(Debug)]
pub struct OpdsFeed {
    pub id: String,
    pub title: String,
    pub entries: Vec<OpdsEntry>,
    // pub links: Vec<OpdsLink>,
}

impl OpdsFeed {
    pub fn new(id: String, title: String, entries: Vec<OpdsEntry>) -> Self {
        Self {
            id,
            title,
            entries,
            // links: Vec::new(),
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
        util::write_xml_element("updated", &chrono::Utc::now().to_rfc3339(), &mut writer)?;

        for entry in &self.entries {
            entry.write(&mut writer)?;
        }

        writer.write(XmlEvent::end_element())?; // end of feed

        Ok(String::from_utf8(writer.into_inner())?)
    }
}
