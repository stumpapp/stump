use anyhow::Result;
use chrono::{DateTime, Utc};
use urlencoding::encode;
use xml::{writer::XmlEvent, EventWriter};

use crate::database::entities::{library, media, series};
use crate::opds::link::OpdsStreamLink;

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
    authors: Option<Vec<String>>,
    links: Vec<OpdsLink>,
    stream_link: Option<OpdsStreamLink>,
}

impl OpdsEntry {
    pub fn new(
        id: String,
        updated: DateTime<Utc>,
        title: String,
        content: Option<String>,
        authors: Option<Vec<String>>,
        links: Option<Vec<OpdsLink>>,
        stream_link: Option<OpdsStreamLink>,
    ) -> Self {
        let links = match links {
            Some(links) => links,
            None => vec![],
        };

        Self {
            id,
            updated,
            title,
            content,
            authors,
            links,
            stream_link,
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

        if let Some(authors) = &self.authors {
            writer.write(XmlEvent::start_element("author"))?;

            for author in authors {
                util::write_xml_element("name", author.as_str(), writer)?;
            }

            writer.write(XmlEvent::end_element())?; // end of author
        }

        for link in &self.links {
            link.write(writer)?;
        }

        if let Some(stream_link) = &self.stream_link {
            stream_link.write(writer)?;
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

impl From<library::Model> for OpdsEntry {
    fn from(l: library::Model) -> Self {
        let mut links = Vec::new();

        let nav_link = OpdsLink::new(
            OpdsLinkType::Navigation,
            OpdsLinkRel::Subsection,
            format!("/opds/v1.2/libraries/{}", l.id),
        );

        links.push(nav_link);

        OpdsEntry {
            id: l.id.to_string(),
            // FIXME:
            updated: chrono::Utc::now(),
            title: l.name,
            // FIXME:
            content: None,
            authors: None,
            links,
            stream_link: None,
        }
    }
}

impl From<series::Model> for OpdsEntry {
    fn from(s: series::Model) -> Self {
        let mut links = Vec::new();

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
            authors: None,
            links,
            stream_link: None,
        }
    }
}

impl From<media::Model> for OpdsEntry {
    fn from(m: media::Model) -> Self {
        let base_url = format!("/opds/v1.2/books/{}", m.id);
        let file_name = format!("{}.{}", m.name, m.extension);
        let file_name_encoded = encode(&file_name);

        let links = vec![
            OpdsLink::new(
                OpdsLinkType::Image,
                OpdsLinkRel::Thumbnail,
                format!("{}/thumbnail", base_url),
            ),
            OpdsLink::new(
                OpdsLinkType::Image,
                OpdsLinkRel::Image,
                format!("{}/pages/1", base_url),
            ),
            OpdsLink::new(
                OpdsLinkType::Zip,
                OpdsLinkRel::Acquisition,
                format!("{}/file/{}", base_url, file_name_encoded),
            ),
        ];

        let stream_link = OpdsStreamLink::new(
            m.id.to_string(),
            m.pages.to_string(),
            // FIXME:
            "image/jpeg".to_string(),
        );

        let mib = m.size as f64 / (1024.0 * 1024.0);

        let content = match m.description {
            Some(description) => Some(format!(
                "{:.1} MiB - {}<br/><br/>{}",
                mib, m.extension, description
            )),
            None => Some(format!("{:.1} MiB - {}", mib, m.extension)),
        };

        OpdsEntry {
            id: m.id.to_string(),
            title: m.name,
            updated: chrono::Utc::now(),
            content,
            links,
            authors: None,
            stream_link: Some(stream_link),
        }
    }
}
