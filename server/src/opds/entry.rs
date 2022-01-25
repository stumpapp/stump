use anyhow::Result;
use chrono::{DateTime, Utc};
use xml::{writer::XmlEvent, EventWriter};

use crate::database::entities::series;

use super::{
    link::{OpdsLink, OpdsLinkRel, OpdsLinkType},
    util,
};

#[derive(Debug)]
pub struct OpdsEntry {
    id: String,
    updated: DateTime<Utc>,
    title: String,
    content: Option<String>,
    authors: Vec<String>,
    links: Vec<OpdsLink>,
}

impl OpdsEntry {
    pub fn new(
        id: String,
        updated: DateTime<Utc>,
        title: String,
        content: Option<String>,
        authors: Vec<String>,
    ) -> Self {
        Self {
            id,
            updated,
            title,
            content,
            authors,
            links: Vec::new(),
        }
    }

    pub fn write(&self, writer: &mut EventWriter<Vec<u8>>) -> Result<()> {
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

        writer.write(XmlEvent::start_element("author"))?;
        for author in &self.authors {
            util::write_xml_element("name", &author, writer)?;
        }
        writer.write(XmlEvent::end_element())?; // end of author

        for link in &self.links {
            link.write(writer)?;
        }

        writer.write(XmlEvent::end_element())?; // end of entry

        Ok(())
    }

    fn get_content(&self) -> Option<String> {
        if let Some(content) = &self.content {
            Some(content.clone().replace("\n", "<br/>"))
        } else {
            None
        }
    }
}

impl From<series::Model> for OpdsEntry {
    fn from(s: series::Model) -> Self {
        let mut links = Vec::new();
        let mut authors = Vec::new();

        let nav_link = OpdsLink::new(
            OpdsLinkType::Navigation,
            OpdsLinkRel::Subsection,
            format!("/opds/v1.2/series/{}", s.id),
        );

        links.push(nav_link);

        OpdsEntry {
            id: s.id.to_string(),
            // FIXME:
            updated: chrono::Utc::now(),
            title: s.title,
            // FIXME:
            content: None,
            authors,
            links,
        }
    }
}
