use xml::{writer::XmlEvent, EventWriter};

use crate::error::CoreResult;

use super::{
	link::OpdsLinkType,
	util::{self, OpdsEnumStr},
};

pub struct OpdsOpenSearch {}

impl OpdsOpenSearch {
	/// Build an xml string for the OpenSearchDescription
	pub fn build() -> CoreResult<String> {
		let raw = Vec::new();
		let mut writer = EventWriter::new(raw);

		writer.write(XmlEvent::start_element("OpenSearchDescription"))?;

		util::write_xml_element("ShortName", "Search", &mut writer)?;
		util::write_xml_element("Description", "Search by keyword", &mut writer)?;
		util::write_xml_element("InputEncoding", "UTF-8", &mut writer)?;
		util::write_xml_element("OutputEncoding", "UTF-8", &mut writer)?;

		let series_example = "/opds/v1.2/series?search={searchTerms}";
		let library_example = "/opds/v1.2/libraries?search={searchTerms}";
		let media_example = "/opds/v1.2/books?search={searchTerms}";

		// series template URL
		writer.write(
			XmlEvent::start_element("Url")
				.attr("type", OpdsLinkType::Acquisition.as_str())
				.attr("template", series_example),
		)?;

		writer.write(XmlEvent::end_element())?; // end of URL

		// libraries template URL
		writer.write(
			XmlEvent::start_element("Url")
				.attr("type", OpdsLinkType::Acquisition.as_str())
				.attr("template", library_example),
		)?;

		writer.write(XmlEvent::end_element())?; // end of URL

		// media template URL
		writer.write(
			XmlEvent::start_element("Url")
				.attr("type", OpdsLinkType::Acquisition.as_str())
				.attr("template", media_example),
		)?;

		writer.write(XmlEvent::end_element())?; // end of URL

		// TODO: more templates? have to look into open search spec to see
		// if that 'is possible' or if it is only supposed to be one

		// https://developer.mozilla.org/en-US/docs/Web/OpenSearch

		writer.write(XmlEvent::end_element())?; // end of feed

		Ok(String::from_utf8(writer.into_inner())?)
	}
}
