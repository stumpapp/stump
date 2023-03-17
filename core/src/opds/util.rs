use xml::{writer::XmlEvent, EventWriter};

use crate::prelude::CoreResult;

pub trait OpdsEnumStr {
	fn as_str(&self) -> &'static str;
}

pub fn tag_id_from_url(tag_authority: &str, url: &str) -> String {
	format!(
		"tag:{}:{}",
		tag_authority,
		url.trim_start_matches('/').replace('/', ":")
	)
}

pub fn write_xml_element(
	name: &str,
	value: &str,
	writer: &mut EventWriter<Vec<u8>>,
) -> CoreResult<()> {
	writer.write(XmlEvent::start_element(name))?;
	writer.write(XmlEvent::characters(value))?;
	writer.write(XmlEvent::end_element())?;
	Ok(())
}

pub fn write_xml_content(
	value: &str,
	writer: &mut EventWriter<Vec<u8>>,
) -> CoreResult<()> {
	writer.write(XmlEvent::start_element("content").attr("type", "html"))?;
	writer.write(XmlEvent::characters(value))?;
	writer.write(XmlEvent::end_element())?;
	Ok(())
}
