// use crate::opds::author::StumpAuthor;
use crate::{
    opds::link::OpdsLink,
    prisma::{library, media, series},
};
use anyhow::Result;
use prisma_client_rust::chrono;
use xml::{writer::XmlEvent, EventWriter};

use super::{
    entry::OpdsEntry,
    link::{OpdsLinkRel, OpdsLinkType},
    util,
};
// use crate::types::alias::{
//     FeedPages, LibraryWithSeries, SeriesWithMedia, SeriesWithMediaAndProgress,
// };

#[derive(Debug)]
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

// Note: this type is disgusting lol
impl From<((series::Data, Vec<media::Data>), (usize, Option<usize>))> for OpdsFeed {
    fn from(payload: ((series::Data, Vec<media::Data>), (usize, Option<usize>))) -> Self {
        let (series_with_media, pages) = payload;
        let (current_page, next_page) = pages;
        let (series, media) = series_with_media;

        let id = series.id;
        let title = series.name;

        // // TODO: use this
        // let author = StumpAuthor::new(
        //     "Stump".to_string(),
        //     Some("https://github.com/aaronleopold/stump".to_string()),
        // );

        // let next_page = match page {
        //     Some(p) => p + 1,
        //     None => 1,
        // };

        let mut links = vec![
            OpdsLink::new(
                OpdsLinkType::Navigation,
                OpdsLinkRel::ItSelf,
                format!("/opds/v1.2/series/{}", id),
            ),
            OpdsLink::new(
                OpdsLinkType::Navigation,
                OpdsLinkRel::Start,
                "/opds/v1.2/catalog".to_string(),
            ),
        ];

        if current_page > 0 {
            links.push(OpdsLink::new(
                OpdsLinkType::Navigation,
                OpdsLinkRel::Previous,
                format!("/opds/v1.2/series/{}?page={}", id, current_page - 1),
            ));
        }

        if let Some(next_page) = next_page {
            links.push(OpdsLink::new(
                OpdsLinkType::Navigation,
                OpdsLinkRel::Next,
                format!("/opds/v1.2/series/{}?page={}", id, next_page),
            ));
        }

        let entries = media.into_iter().map(OpdsEntry::from).collect();

        Self::new(id, title, Some(links), entries)
    }
}

impl From<(library::Data, Vec<series::Data>)> for OpdsFeed {
    fn from((library, series): (library::Data, Vec<series::Data>)) -> Self {
        let id = library.id;
        let title = library.name;

        let links = vec![
            OpdsLink::new(
                OpdsLinkType::Navigation,
                OpdsLinkRel::ItSelf,
                format!("/opds/v1.2/libraries/{}", id),
            ),
            OpdsLink::new(
                OpdsLinkType::Navigation,
                OpdsLinkRel::Start,
                "/opds/v1.2/catalog".to_string(),
            ),
        ];

        let entries = series.into_iter().map(OpdsEntry::from).collect();

        Self::new(id, title, Some(links), entries)
    }
}
