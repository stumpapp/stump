use anyhow::Result;
use prisma_client_rust::chrono;
use prisma_client_rust::chrono::{DateTime, Utc};
use urlencoding::encode;
use xml::{writer::XmlEvent, EventWriter};

use crate::{
    opds::link::OpdsStreamLink,
    prisma::{library, media, series},
    types::models::MediaWithProgress,
};

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

impl From<library::Data> for OpdsEntry {
    fn from(l: library::Data) -> Self {
        let mut links = Vec::new();

        let nav_link = OpdsLink::new(
            OpdsLinkType::Navigation,
            OpdsLinkRel::Subsection,
            format!("/opds/v1.2/libraries/{}", l.id),
        );

        links.push(nav_link);

        OpdsEntry {
            id: l.id,
            updated: l.updated_at,
            title: l.name,
            content: l.description,
            authors: None,
            links,
            stream_link: None,
        }
    }
}

// impl From<SeriesWithBookCount> for OpdsEntry {
//     fn from(s: SeriesWithBookCount) -> Self {
//         let mut links = Vec::new();

//         let nav_link = OpdsLink::new(
//             OpdsLinkType::Navigation,
//             OpdsLinkRel::Subsection,
//             format!("/opds/v1.2/series/{}", s.id),
//         );

//         links.push(nav_link);

//         OpdsEntry {
//             id: s.id.to_string(),
//             // FIXME:
//             updated: chrono::Utc::now(),
//             title: s.title,
//             // FIXME:
//             content: None,
//             authors: None,
//             links,
//             stream_link: None,
//         }
//     }
// }

impl From<series::Data> for OpdsEntry {
    fn from(s: series::Data) -> Self {
        let mut links = Vec::new();

        let nav_link = OpdsLink::new(
            OpdsLinkType::Navigation,
            OpdsLinkRel::Subsection,
            format!("/opds/v1.2/series/{}", s.id),
        );

        links.push(nav_link);

        OpdsEntry {
            id: s.id.to_string(),
            updated: s.updated_at,
            title: s.name,
            // TODO: I feel like a series could have a description, just have to figure out
            // the best way to include it. I could look for ComicInfo.xml files or something at
            // the directory root, or some other file, or maybe I could just leave it out.
            content: None,
            authors: None,
            links,
            stream_link: None,
        }
    }
}

impl From<media::Data> for OpdsEntry {
    fn from(m: media::Data) -> Self {
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
            None,
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

impl From<MediaWithProgress> for OpdsEntry {
    fn from(media: MediaWithProgress) -> Self {
        let base_url = format!("/opds/v1.2/books/{}", media.id);
        let file_name = format!("{}.{}", media.name, media.extension);
        let file_name_encoded = encode(&file_name);

        // TODO: parse into function to reduce code duplication
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

        let current_page = match media.progress {
            Some(progress) => Some(progress.to_string()),
            _ => None,
        };

        let stream_link = OpdsStreamLink::new(
            media.id.to_string(),
            media.pages.to_string(),
            // FIXME:
            "image/jpeg".to_string(),
            current_page,
        );

        let mib = media.size as f64 / (1024.0 * 1024.0);

        let content = match media.description {
            Some(description) => Some(format!(
                "{:.1} MiB - {}<br/><br/>{}",
                mib, media.extension, description
            )),
            None => Some(format!("{:.1} MiB - {}", mib, media.extension)),
        };

        OpdsEntry {
            id: media.id.to_string(),
            title: media.name,
            updated: chrono::Utc::now(),
            content,
            links,
            authors: None,
            stream_link: Some(stream_link),
        }
    }
}
