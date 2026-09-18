use std::{
	collections::{HashMap, HashSet},
	path::Path,
};

use models::entity::media_metadata;
use quick_xml::{
	events::{BytesEnd, BytesStart, BytesText, Event},
	Reader, Writer,
};

use crate::{media::processor::process_metadata_raw, CoreError};

const SHELL_COMIC_INFO: &str = r#"<?xml version="1.0"?>
<ComicInfo xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema">
</ComicInfo>
"#;

// tags which _might_ contain html, will be handled differently if encountered
const HTML_CONTENT_TAGS: [&str; 1] = ["Summary"];

/// A function that will perform the full set of steps to update metadata on disk based on
/// metadata from the database:
/// 1. Fetch the corresponding book
/// 2. Inline replace metadata fields with database fields
/// It will return the newly generated XML as bytes
pub async fn generate_comic_info<P: AsRef<Path>>(
	book_path: P,
	metadata: media_metadata::Model,
	existing_tags: Vec<String>,
) -> Result<Vec<u8>, CoreError> {
	let existing_xml_bytes = process_metadata_raw(book_path)
		.await?
		.unwrap_or_else(|| SHELL_COMIC_INFO.to_string().into_bytes().to_vec());
	let xml_string = String::from_utf8_lossy(&existing_xml_bytes).to_string();

	let updated_metadata = merge_metadata_into_xml(metadata, existing_tags, xml_string)?;

	Ok(updated_metadata.as_bytes().to_vec())
}

type XmlString = String;

fn merge_metadata_into_xml(
	metadata: media_metadata::Model,
	existing_tags: Vec<String>,
	existing_xml: XmlString,
) -> Result<XmlString, CoreError> {
	let mut reader = Reader::from_str(&existing_xml);
	reader.config_mut().trim_text(true);

	let mut writer = Writer::new(Vec::new());
	let mut buf = Vec::new();
	let mut current_tag = String::default();
	let mut visited = HashSet::<String>::new();
	let mut empty_field = false;

	let metadata_map = build_metadata_map(metadata.clone(), existing_tags.clone());

	loop {
		match reader.read_event_into(&mut buf) {
			Ok(Event::Start(e)) => {
				let tag = String::from_utf8_lossy(e.name().as_ref()).to_string();
				current_tag = tag.clone();
				empty_field = true;
				// case where we need to rm it since nullish in db
				if let Some(None) = metadata_map.get(tag.as_str()) {
					visited.insert(tag.clone());
				} else {
					// otherwise write the start tag
					writer.write_event(Event::Start(e))?;
				}
			},
			Ok(Event::Text(e)) => {
				empty_field = false;
				match metadata_map.get(&current_tag.as_str()) {
					Some(Some(value)) => {
						if HTML_CONTENT_TAGS.contains(&current_tag.as_str()) {
							let end = quick_xml::events::BytesEnd::new(&current_tag);

							if let Err(error) = reader.read_text(end.name()) {
								return Err(error.into());
							}

							writer.write_event(Event::Text(BytesText::new(value)))?;
							writer
								.write_event(Event::End(BytesEnd::new(&current_tag)))?;
						} else {
							// TODO: do we need to escape value?
							writer.write_event(Event::Text(BytesText::new(value)))?;
							visited.insert(current_tag.clone());
						}
					},
					Some(None) => {
						// already handled in Event::Start
					},
					None => {
						tracing::debug!(
							?current_tag,
							"This field is not managed by Stump. Writing it back as-is."
						);
						writer.write_event(Event::Text(e))?;
					},
				}
			},
			// Event::Empty only applies to self-closing tags like <Title />, Event::Start will NOT be matched
			Ok(Event::Empty(e)) => {
				let tag = String::from_utf8_lossy(e.name().as_ref()).to_string();
				current_tag = tag.clone();
				match metadata_map.get(current_tag.as_str()) {
					Some(Some(value)) => {
						// TODO: do we need to escape value?
						writer.write_event(Event::Start(e))?;
						writer.write_event(Event::Text(BytesText::new(value)))?;
						writer.write_event(Event::End(BytesEnd::new(&current_tag)))?;
						visited.insert(current_tag.clone());
					},
					Some(None) => {
						visited.insert(tag.clone());
					},
					None => {
						tracing::debug!(
							?current_tag,
							"This field is not managed by Stump. Writing it back as-is."
						);
						writer.write_event(Event::Empty(e))?;
					},
				}
			},
			Ok(Event::End(e)) => {
				// not end, i.e. eof, just end of tag
				if empty_field {
					match metadata_map.get(&current_tag.as_str()) {
						Some(Some(value)) => {
							// TODO: do we need to escape value?
							writer.write_event(Event::Text(BytesText::new(value)))?;
							visited.insert(current_tag.clone());
						},
						Some(None) => {
							// already handled in Event::Start
						},
						None => {
							tracing::debug!(
    							?current_tag,
    							"This field is not managed by Stump. Writing it back as-is."
							);
						},
					}
				}
				let tag = String::from_utf8_lossy(e.name().as_ref()).to_string();

				if let Some(None) = metadata_map.get(tag.as_str()) {
					current_tag.clear();
				} else {
					// when we are at ComicInfo, it is the closer. so before writing it, we have to append all the new fields to the xml
					if tag == "ComicInfo" {
						for (xml_tag, value) in metadata_map.iter() {
							match value {
								Some(existing_value)
									if !visited.contains(&xml_tag.to_string()) =>
								{
									writer.write_event(Event::Start(BytesStart::new(
										&xml_tag.to_string(),
									)))?;
									writer.write_event(Event::Text(BytesText::new(
										existing_value,
									)))?;
									writer.write_event(Event::End(BytesEnd::new(
										&xml_tag.to_string(),
									)))?;
								},
								// we do not care about values which are None since we don't want to write them
								_ => continue,
							}
						}
					}
					writer.write_event(Event::End(e))?;
				}
			},
			Ok(Event::Eof) => break,
			// if none of the above, idk how to handle it so just write it as-is
			Ok(e) => {
				tracing::debug!(
					event = ?e,
					"Ecountered event which is not explicitly handled. Writing back as-is"
				);
				writer.write_event(e)?;
			},
			Err(error) => return Err(error.into()),
		}
	}

	Ok(String::from_utf8(writer.into_inner())?)
}

fn build_metadata_map(
	metadata: media_metadata::Model,
	existing_tags: Vec<String>,
) -> HashMap<&'static str, Option<String>> {
	let mut map = HashMap::new();

	map.insert("Title", metadata.title.clone());
	map.insert("Series", metadata.series.clone());
	map.insert("Number", metadata.number.clone().map(|x| x.to_string()));
	map.insert("Volume", metadata.volume.clone().map(|x| x.to_string()));
	map.insert("Summary", metadata.summary.clone());
	map.insert("Notes", metadata.notes.clone());
	map.insert("Year", metadata.year.clone().map(|x| x.to_string()));
	map.insert("Month", metadata.month.clone().map(|x| x.to_string()));
	map.insert("Day", metadata.day.clone().map(|x| x.to_string()));
	map.insert("Writer", metadata.writers.clone());
	map.insert("Penciller", metadata.pencillers.clone());
	map.insert("Inker", metadata.inkers.clone());
	map.insert("Colorist", metadata.colorists.clone());
	map.insert("Letterer", metadata.letterers.clone());
	map.insert("Cover Artist", metadata.cover_artists.clone());
	map.insert("Editor", metadata.editors.clone());
	map.insert("Publisher", metadata.publisher.clone());
	map.insert("Web", metadata.links.clone());
	map.insert(
		"PageCount",
		metadata.page_count.clone().map(|x| x.to_string()),
	);
	map.insert("Characters", metadata.characters.clone());
	map.insert("Teams", metadata.teams.clone());
	map.insert(
		"Tags",
		if existing_tags.is_empty() {
			None
		} else {
			Some(existing_tags.join(","))
		},
	);

	map
}

#[cfg(test)]
mod tests {
	use crate::metadata::ProcessedMediaMetadata;

	use super::*;
	use models::entity::media_metadata;
	use quick_xml::de::from_str as xml_from_str;

	#[test]
	fn test_basic_conversion() {
		// this is what currently exists in the embedded ComicInfo.xml
		let existing_xml = r#"<?xml version="1.0"?>
<ComicInfo xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema">
    <Title>Invincible 001</Title>
</ComicInfo>
"#;

		let metadata = media_metadata::Model {
			title: Some("Invincible #1".to_string()),
			..Default::default()
		};

		let xml_string =
			merge_metadata_into_xml(metadata.clone(), vec![], existing_xml.to_string())
				.expect("Should have converted comic info");
		println!("{}", xml_string);
		assert!(xml_string.contains("Invincible #1")); // the updated title

		let deserialized_xml: ProcessedMediaMetadata =
			xml_from_str(&xml_string).expect("Should have properly parsed xml_string");

		assert_eq!(metadata.title, deserialized_xml.title);
	}

	#[test]
	fn test_full_conversion() {
		// TODO: add tags to this example
		let existing_xml = r#"<?xml version="1.0"?>
<ComicInfo xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema">
  <Title>Heist Part Two</Title>
  <Series>The Amazing Spider-Man</Series>
  <Number>9</Number>
  <Volume>5</Volume>
  <Summary>There's been a major theft the likes of which we've never seen and for once, The Black Cat didn't do it.

But Spider-Man might need the help of his once-foe-once-friend-once-crime-boss Felicia Hardy, the Black Cat!

*List of covers and their creators:*
 Cover | Name                                                | Creator(s)                                | Sidebar Location |
-------------------------------------------------------------------------------------------------------------------------
 Reg   | Regular Cover                                       | Humberto Ramos &amp; Edgar Delgado            | 1                |
 Var   | Uncanny X-Men Variant Cover                         | Clayton Crain                             | 8                |
 Var   | Variant Cover                                       | Mike Wieringo, Tim Townsend &amp; Jason Keith | 2                |
 Var   | Virgin Variant Cover                                | Mike Wieringo, Tim Townsend &amp; Jason Keith | 9-10             |
 RE    | ComicXposure Variant Cover                          | Jeff Dekal                                | 3                |
 RE    | ComicXposure Virgin Variant Cover                   | Jeff Dekal                                | 4                |
 RE    | Unknown Comic Books Connecting Variant Cover        | Mico Suayan                               | 5                |
 RE    | Unknown Comic Books Connecting Virgin Variant Cover | Mico Suayan                               | 6                |
 2nd   | Second Printing Variant Cover                       | Humberto Ramos                            | 7                |
Note: Unknown Comic Books variant by Mico Suayan connects with Venom #8, Web of Venom: Carnage Born #1, and Amazing Spider-Man #10.</Summary>
  <Notes>Tagged with the ninjas.walk.alone fork of ComicTagger 1.3.4 using info from Comic Vine on 2022-02-09 10:38:41.  [Issue ID 692056]</Notes>
  <Year>2019</Year>
  <Month>01</Month>
  <Day>01</Day>
  <Writer>Nick Spencer</Writer>
  <Penciller>Humberto Ramos, Michele Bandini</Penciller>
  <Inker>Michele Bandini, Victor Olazaba</Inker>
  <Colorist>Edgar Delgado, Erick Arciniega</Colorist>
  <Letterer>Joe Caramagna</Letterer>
  <CoverArtist>Clayton Crain, Edgar Delgado, Humberto Ramos, Jason Keith, Jeff Dekal, Mike Wieringo, Tim Townsend</CoverArtist>
  <Editor>Kathleen Wisneski, Nick Lowe</Editor>
  <Publisher>Marvel</Publisher>
  <Web>https://comicvine.gamespot.com/the-amazing-spider-man-9-heist-part-two/4000-692056/</Web>
  <PageCount>24</PageCount>
  <Characters>Armadillo, Black Cat, Captain America, Carlie Cooper, Hawkeye, Human Torch, Iron Man, Jarvis, Kate Bishop, Mary Jane, Odessa Drake, Spider-Man, Squirrel Girl, Thing, Thor, Walter Hardy, Wasp</Characters>
  <Teams>Thieves Guild</Teams>
  <Pages>
						<Page Image="0" Type="FrontCover" ImageSize="741291" />
						<Page Image="1" ImageSize="1383958" />
						<Page Image="2" ImageSize="1897301" />
						<Page Image="3" ImageSize="1956592" />
						<Page Image="4" ImageSize="1348064" />
						<Page Image="5" ImageSize="2050915" />
						<Page Image="6" ImageSize="1570591" />
						<Page Image="7" ImageSize="1868853" />
						<Page Image="8" ImageSize="1703356" />
						<Page Image="9" ImageSize="1835994" />
						<Page Image="10" ImageSize="1600821" />
						<Page Image="11" ImageSize="2207163" />
						<Page Image="12" ImageSize="2401548" />
						<Page Image="13" ImageSize="1891242" />
						<Page Image="14" ImageSize="2012601" />
						<Page Image="15" ImageSize="1761542" />
						<Page Image="16" ImageSize="1797303" />
						<Page Image="17" ImageSize="2332849" />
						<Page Image="18" ImageSize="2023561" />
						<Page Image="19" ImageSize="2239700" />
						<Page Image="20" ImageSize="2271632" />
						<Page Image="21" ImageSize="1879935" />
						<Page Image="22" ImageSize="1663028" />
						<Page Image="23" ImageSize="750766" />
  </Pages>
</ComicInfo>"#;

		let metadata = media_metadata::Model {
			title: Some("Heist Part Dos".to_string()),
			series: Some("Heist".to_string()),
			number: rust_decimal::Decimal::from_f32_retain(8.5_f32),
			volume: Some(4),
			summary: Some("This is a test summary".to_string()),
			notes: Some("No notes".to_string()),
			year: Some(67),
			month: Some(4),
			day: Some(20),
			writers: Some("Nick Spencer".to_string()),
			pencillers: Some("Humberto Ramos, Michele Bandini".to_string()),
			inkers: Some("Michele Bandini, Victor Olazaba".to_string()),
			colorists: Some("Edgar Delgado, Erick Arciniega".to_string()),
			letterers: Some("Joe Caramagna".to_string()),
			cover_artists: Some("Clayton Crain, Edgar Delgado, Humberto Ramos, Jason Keith, Jeff Dekal, Mike Wieringo, Tim Townsend".to_string()),
			editors: Some("Kathleen Wisneski, Nick Lowe".to_string()),
			publisher: Some("Marvel".to_string()),
			links: Some("https://comicvine.gamespot.com/the-amazing-spider-man-9-heist-part-two/4000-692056/".to_string()),
			page_count: Some(24),
			characters: Some("Armadillo, Black Cat, Captain America, Carlie Cooper, Hawkeye, Human Torch, Iron Man, Jarvis, Kate Bishop, Mary Jane, Odessa Drake, Spider-Man, Squirrel Girl, Thing, Thor, Walter Hardy, Wasp".to_string()),
			teams: Some("Thieves Guild".to_string()),
			..Default::default()
		};

		let xml_string =
			merge_metadata_into_xml(metadata.clone(), vec![], existing_xml.to_string())
				.expect("Should have converted comic info");
		println!("{}", &xml_string);
		let deserialized_xml: ProcessedMediaMetadata =
			xml_from_str(&xml_string).expect("Should have properly parsed xml_string");

		assert_eq!(deserialized_xml.title, Some("Heist Part Dos".to_string()));
		assert_eq!(deserialized_xml.series, Some("Heist".to_string()));
		assert_eq!(deserialized_xml.number, Some(8.5));
		assert_eq!(deserialized_xml.volume, Some(4));
		assert_eq!(
			deserialized_xml.summary,
			Some("This is a test summary".to_string())
		);
		assert_eq!(deserialized_xml.notes, Some("No notes".to_string()));
		assert_eq!(deserialized_xml.year, Some(67));
		assert_eq!(deserialized_xml.month, Some(4));
		assert_eq!(deserialized_xml.day, Some(20));
		assert_eq!(
			deserialized_xml.writers,
			Some(vec!["Nick Spencer".to_string()])
		);
		assert_eq!(
			deserialized_xml.pencillers,
			Some(vec![
				"Humberto Ramos".to_string(),
				"Michele Bandini".to_string()
			])
		);
		assert_eq!(
			deserialized_xml.inkers,
			Some(vec![
				"Michele Bandini".to_string(),
				"Victor Olazaba".to_string()
			])
		);
		assert_eq!(
			deserialized_xml.colorists,
			Some(vec![
				"Edgar Delgado".to_string(),
				"Erick Arciniega".to_string()
			])
		);
		assert_eq!(
			deserialized_xml.letterers,
			Some(vec!["Joe Caramagna".to_string()])
		);
		assert_eq!(
			deserialized_xml.cover_artists,
			Some(vec![
				"Clayton Crain".to_string(),
				"Edgar Delgado".to_string(),
				"Humberto Ramos".to_string(),
				"Jason Keith".to_string(),
				"Jeff Dekal".to_string(),
				"Mike Wieringo".to_string(),
				"Tim Townsend".to_string()
			])
		);
		assert_eq!(
			deserialized_xml.editors,
			Some(vec![
				"Kathleen Wisneski".to_string(),
				"Nick Lowe".to_string()
			])
		);
		assert_eq!(deserialized_xml.publisher, Some("Marvel".to_string()));
		assert_eq!(deserialized_xml.links, Some(vec!["https://comicvine.gamespot.com/the-amazing-spider-man-9-heist-part-two/4000-692056/".to_string()]));
		assert_eq!(deserialized_xml.page_count, Some(24));
		assert_eq!(
			deserialized_xml.characters,
			Some(vec![
				"Armadillo".to_string(),
				"Black Cat".to_string(),
				"Captain America".to_string(),
				"Carlie Cooper".to_string(),
				"Hawkeye".to_string(),
				"Human Torch".to_string(),
				"Iron Man".to_string(),
				"Jarvis".to_string(),
				"Kate Bishop".to_string(),
				"Mary Jane".to_string(),
				"Odessa Drake".to_string(),
				"Spider-Man".to_string(),
				"Squirrel Girl".to_string(),
				"Thing".to_string(),
				"Thor".to_string(),
				"Walter Hardy".to_string(),
				"Wasp".to_string()
			])
		);
		assert_eq!(
			deserialized_xml.teams,
			Some(vec!["Thieves Guild".to_string()])
		);
	}

	#[test]
	fn test_plain_text_to_html() {
		let existing_xml = r#"<?xml version="1.0"?>
<ComicInfo xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema">
    <Title>Invincible 001</Title>
    <Summary>This is a test summary</Summary>
</ComicInfo>"#;

		let markdown_summary = r#"There's been a major theft the likes of which we've never seen and for once, The Black Cat didn't do it.

But Spider-Man might need the help of his once-foe-once-friend-once-crime-boss Felicia Hardy, the Black Cat!

*List of covers and their creators:*
 Cover | Name                                                | Creator(s)                                | Sidebar Location |
-------------------------------------------------------------------------------------------------------------------------
 Reg   | Regular Cover                                       | Humberto Ramos &amp; Edgar Delgado            | 1                |
 Var   | Uncanny X-Men Variant Cover                         | Clayton Crain                             | 8                |
 Var   | Variant Cover                                       | Mike Wieringo, Tim Townsend &amp; Jason Keith | 2                |
 Var   | Virgin Variant Cover                                | Mike Wieringo, Tim Townsend &amp; Jason Keith | 9-10             |
 RE    | ComicXposure Variant Cover                          | Jeff Dekal                                | 3                |
 RE    | ComicXposure Virgin Variant Cover                   | Jeff Dekal                                | 4                |
 RE    | Unknown Comic Books Connecting Variant Cover        | Mico Suayan                               | 5                |
 RE    | Unknown Comic Books Connecting Virgin Variant Cover | Mico Suayan                               | 6                |
 2nd   | Second Printing Variant Cover                       | Humberto Ramos                            | 7                |
Note: Unknown Comic Books variant by Mico Suayan connects with Venom #8, Web of Venom: Carnage Born #1, and Amazing Spider-Man #10."#;

		let metadata = media_metadata::Model {
			summary: Some(markdown_summary.to_string()),
			..Default::default()
		};

		let xml_string =
			merge_metadata_into_xml(metadata.clone(), vec![], existing_xml.to_string())
				.expect("Should have converted comic info");

		let deserialized_xml: ProcessedMediaMetadata =
			xml_from_str(&xml_string).expect("Should have properly parsed xml_string");
		assert_eq!(deserialized_xml.summary, metadata.summary);
	}

	#[test]
	fn test_append_fields_not_in_existing_xml() {
		let existing_xml = r#"<?xml version="1.0"?>
		<ComicInfo xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema">
		    <Title>Invincible 001</Title>
		</ComicInfo>
		"#;

		let metadata = media_metadata::Model {
			title: Some("Invincible #1".to_string()),
			characters: Some("Mark Grayson, Nolan Grayson, Debbie Grayson".to_string()),
			..Default::default()
		};

		let xml_string =
			merge_metadata_into_xml(metadata.clone(), vec![], existing_xml.to_string())
				.expect("Should have converted comic info");

		let deserialized_xml: ProcessedMediaMetadata =
			xml_from_str(&xml_string).expect("Should have properly parsed xml_string");

		assert!(deserialized_xml
			.characters
			.expect("characters should have been parsed")
			.contains(&"Mark Grayson".to_string()));
	}

	// ensure we do not have data loss for non-managed fields
	#[test]
	fn test_retain_non_managed_fields() {
		let existing_xml = r#"<?xml version="1.0"?>
	<ComicInfo xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema">
	    <Title>Invincible 001</Title>
		<Banana>Yum</Banana>
	</ComicInfo>
	"#;

		let metadata = media_metadata::Model {
			title: Some("Invincible #1".to_string()),
			..Default::default()
		};

		let xml_string =
			merge_metadata_into_xml(metadata.clone(), vec![], existing_xml.to_string())
				.expect("Should have converted comic info");

		assert!(xml_string.contains(&"<Banana>Yum</Banana>".to_string()))
	}

	// <Tags>Fantasy</Tags> , metadata.tags = ["Fantasy", "Sci-Fi"] -> <Tags>Fantasy,Sci-Fi</Tags>
	#[test]
	fn test_update_existing_tags() {
		let existing_xml = r#"<?xml version="1.0"?>
<ComicInfo xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema">
    <Title>Invincible 001</Title>
	<Tags>Fantasy</Tags>
</ComicInfo>
"#;

		let metadata = media_metadata::Model {
			title: Some("Invincible #1".to_string()),
			..Default::default()
		};

		let xml_string = merge_metadata_into_xml(
			metadata.clone(),
			vec!["Fantasy".to_string(), "Sci-Fi".to_string()],
			existing_xml.to_string(),
		)
		.expect("Should have converted comic info");

		assert!(xml_string.contains(&"<Tags>Fantasy,Sci-Fi</Tags>".to_string()))
	}

	// no <Tags> in XML -> metadata.tags = ["Fantasy"] -> <Tags>Fantasy</Tags>
	#[test]
	fn test_adds_tags_field_when_previously_missing() {
		let existing_xml = r#"<?xml version="1.0"?>
<ComicInfo xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema">
    <Title>Invincible 001</Title>
</ComicInfo>
"#;

		let metadata = media_metadata::Model {
			title: Some("Invincible #1".to_string()),
			..Default::default()
		};

		let xml_string = merge_metadata_into_xml(
			metadata.clone(),
			vec!["Fantasy".to_string()],
			existing_xml.to_string(),
		)
		.expect("Should have converted comic info");

		assert!(xml_string.contains(&"<Tags>Fantasy</Tags>".to_string()))
	}
}
