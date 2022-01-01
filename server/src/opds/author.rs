use anyhow::Result;
use xml::EventWriter;

use super::util;

pub struct OpdsAuthor {
    pub name: String,
    pub uri: Option<String>,
}

impl OpdsAuthor {
    pub fn new(name: String, uri: Option<String>) -> OpdsAuthor {
        OpdsAuthor {
            name: name,
            uri: uri,
        }
    }

    pub fn write(&self, writer: &mut EventWriter<Vec<u8>>) -> Result<()> {
        writer.write(xml::writer::XmlEvent::start_element("author"))?;
        util::write_xml_element("name", &self.name, writer)?;

        if let Some(uri) = &self.uri {
            util::write_xml_element("uri", &uri, writer)?;
        }

        writer.write(xml::writer::XmlEvent::end_element())?; // end of author

        Ok(())
    }
}
