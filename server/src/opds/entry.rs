use anyhow::Result;
use chrono::{DateTime, Utc};
use xml::{writer::XmlEvent, EventWriter};

use super::util;

#[derive(Debug)]
pub struct OpdsEntry {
    id: String,
    updated: DateTime<Utc>,
    title: String,
    content: String,
    authors: Vec<String>,
    // links: Vec<OpdsLink>,
}

impl OpdsEntry {
    pub fn new(
        id: String,
        updated: DateTime<Utc>,
        title: String,
        content: String,
        authors: Vec<String>,
    ) -> Self {
        Self {
            id,
            updated,
            title,
            content,
            authors,
            // links: Vec::new(),
        }
    }

    pub fn write(&self, writer: &mut EventWriter<Vec<u8>>) -> Result<()> {
        writer.write(XmlEvent::start_element("entry"))?;

        util::write_xml_element("title", &self.title, writer)?;
        util::write_xml_element("id", &self.id, writer)?;
        util::write_xml_element("updated", &self.updated.to_rfc3339(), writer)?;
        util::write_xml_content(&self.content, writer)?;

        writer.write(XmlEvent::start_element("author"))?;
        for author in &self.authors {
            util::write_xml_element("name", &author, writer)?;
        }
        writer.write(XmlEvent::end_element())?; // end of author

        // TODO: write links

        writer.write(XmlEvent::end_element())?; // end of entry

        Ok(())
    }
}
