use xml::EventWriter;

use crate::prelude::CoreResult;

use super::util;

/// Represents an author in an OPDS feed.
pub struct StumpAuthor {
	pub name: String,
	pub uri: Option<String>,
}

impl StumpAuthor {
	/// Creates a new author.
	pub fn new(name: String, uri: Option<String>) -> StumpAuthor {
		StumpAuthor { name, uri }
	}

	/// Writes the [StumpAuthor] instance as XML.
	///
	/// ## Example
	/// ```rust
	/// use stump_core::opds::author::StumpAuthor;
	/// use xml::EventWriter;
	///
	/// let author = StumpAuthor::new("Aaron Leopold".to_string(), None);
	/// let xml_str = r#"<?xml version="1.0" encoding="utf-8"?><author><name>Aaron Leopold</name></author>"#;
	///
	/// let mut writer = EventWriter::new(Vec::new());
	/// author.write(&mut writer).unwrap();
	/// let result = String::from_utf8(writer.into_inner()).unwrap();
	///
	/// assert_eq!(result, xml_str);
	/// ```
	pub fn write(&self, writer: &mut EventWriter<Vec<u8>>) -> CoreResult<()> {
		writer.write(xml::writer::XmlEvent::start_element("author"))?;
		util::write_xml_element("name", &self.name, writer)?;

		if let Some(uri) = &self.uri {
			util::write_xml_element("uri", uri, writer)?;
		}

		writer.write(xml::writer::XmlEvent::end_element())?; // end of author

		Ok(())
	}
}
