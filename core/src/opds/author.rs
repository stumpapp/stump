use xml::EventWriter;

use crate::types::CoreResult;

use super::util;

pub struct StumpAuthor {
	pub name: String,
	pub uri: Option<String>,
}

impl StumpAuthor {
	pub fn new(name: String, uri: Option<String>) -> StumpAuthor {
		StumpAuthor {
			name: name,
			uri: uri,
		}
	}

	pub fn write(&self, writer: &mut EventWriter<Vec<u8>>) -> CoreResult<()> {
		writer.write(xml::writer::XmlEvent::start_element("author"))?;
		util::write_xml_element("name", &self.name, writer)?;

		if let Some(uri) = &self.uri {
			util::write_xml_element("uri", &uri, writer)?;
		}

		writer.write(xml::writer::XmlEvent::end_element())?; // end of author

		Ok(())
	}
}
