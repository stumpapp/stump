use chrono::NaiveDate;
use quick_xml::{
	events::{attributes::Attribute, BytesEnd, BytesStart, BytesText, Event},
	Reader, Writer,
};
use std::{
	collections::{HashMap, HashSet},
	path::Path,
};

use models::entity::{age_restriction::Column::RestrictOnUnset, media_metadata};

use crate::CoreError;

// TODO: make me plz
//
// reference probably helpful to see parse_opf_xml
//
// TODO: psudo code brainstorm session, reference parse_opf_xml but also read through specs?
// - https://standardebooks.org/manual/1.8.7
// - https://standardebooks.org/manual/1.8.7/9-metadata
// - see examples in integration-tests/data (e.g., calibre-html-descriptions.opf)
//
// fn generate_epub_opf(book_path, metadata, existing_tags) -> Result<Option<Vec<u8>>, CoreError> {
//      let existing_opf_bytes = process_metadata_raw(book_path)?;
//      let opf_string = existing_opf_bytes.to_string();
//      let updated_opf = merge_opf_metadata(&opf_string, metadata, existing_tags)?;
//      Ok(Some(updated_opf))
// }

// TODO:
// - scream AHH
// - we need to handle some tags differently, e.g. some that can come up multiple times
//   like subject. we can't write the full list of tags in every subject tag
// - keep track of visited

pub async fn generate_epub_opf<P: AsRef<Path>>(
	book_path: P,
	metadata: media_metadata::Model,
	existing_tags: Vec<String>,
) -> Result<Vec<u8>, CoreError> {
	// let existing_xml_bytes = process_metadata_raw_async(book_path)
	// 	.await?
	// 	.unwrap_or_else(|| SHELL_COMIC_INFO.to_string().into_bytes().to_vec());
	// let xml_string = String::from_utf8_lossy(&existing_xml_bytes).to_string();

	// let updated_metadata = merge_metadata_into_xml(metadata, existing_tags, xml_string)?;

	// Ok(updated_metadata.as_bytes().to_vec())

	unimplemented!()
}

type OpfString = String;

fn merge_opf_metadata(
	opf_string: OpfString,
	metadata: media_metadata::Model,
	existing_tags: Vec<String>,
) -> Result<OpfString, CoreError> {
	let mut reader = Reader::from_str(&opf_string);
	reader.config_mut().trim_text(true);

	let mut writer = Writer::new(Vec::new());
	let mut buf = Vec::new();
	let mut current_tag = String::default(); // e.g., dc:publisher, meta, etc
	let mut struct_field = String::default(); // e.g., series/series_index/publisher etc
	let mut visited = HashSet::<String>::new();
	let mut empty_field = false;

	// TODO: need this?
	let mut opf_metadata: HashMap<String, Vec<String>> = HashMap::new();
	let metadata_map = build_metadata_value_map(metadata, existing_tags);

	// tags which _might_ contain html, will be handled differently if encountered
	const HTML_CONTENT_TAGS: [&str; 3] = ["description", "summary", "synopsis"];

	// calibre-2.opf
	// TODO(sort_name): add to metadata
	// property file-as == sort_name
	// calibre:series
	//

	////////////////////
	// REVISED ???? //
	//
	// fn get_struct_field(local_name):
	//  if title: return title
	//  if publisher: return publisher
	//
	// fn get_metadata_field(local_name, map):
	//  let managed_field = get_struct_field(local_name)
	//  if !managed_field return none
	//  return map.get(managed_field)
	//
	// pending_events = hashmap() {"title": StartEvent}
	//
	// fn resolve_writable_event(event, local_name):
	//  match get_metadata_field(current_local_tag)
	//      if Some(Some(value)) and non-empty and non-changed:
	//          return event
	//      if Some(Some(value)) and non-empty:
	//          return event.replacetext(value)
	//      if Some(None): // lol some nun
	//          return None
	//      if None:
	//          return event
	//
	// let map = build_metadata_value_map()
	// let visited = hashmap()
	//////////////////

	let mut is_dropping_element = false;

	loop {
		match reader.read_event_into(&mut buf) {
			Ok(Event::Start(bytes)) => {
				if is_dropping_element {
					buf.clear();
					continue;
				}

				let local_name =
					String::from_utf8_lossy(bytes.local_name().as_ref()).to_string();

				// if managed value exists at all
				let Some(managed_value) = metadata_map.get(local_name.as_str()).cloned()
				else {
					// not managed by stump, write as-is
					writer.write_event(Event::Start(bytes))?;
					continue;
				};

				// if managed value exists and is set to a non-null
				let Some(value) = managed_value else {
					// otherwise, null -> no need to write it
					is_dropping_element = true;
					continue;
				};

				// local_name == meta:
				//  find attr named name -> calibre:series?
				//      content=metadata_map.series
				//
				// identifier_{value of opf:scheme.tolowercase()}

				// let value = match managed_value {
				// 	Some(value) => value,
				// 	// if set to null, we do not write it to opf
				// 	None => {
				// 		is_dropping_element = true;
				// 		continue;
				// 	},
				// };

				//  field = get_metadata_field(local_name, map) <-- value IN metadata model for field
				//  if field.is_empty():
				//      write_event(event)
				//  else if visited.get(field):
				//      is_dropping_element = true // TODO: might not be fully right
				//  else:
				//      current_field = raw_tag_name
				//      TODO: list
				//          1. some events need replacements of values in attrs, so we would need to write start with those replacements
				//          2. text will need the start event written before writing text
				//          3. move/copy the some nun check, we dont need to write start then
				//
				//      // OR
				//      current_field = raw_tag_name
				//      if field we know has value in Text:
				//          pending_events.insert(field, event)
			},
			Ok(Event::Empty(bytes)) => {},
			Ok(Event::Text(bytes)) => {
				//  if is_dropping_element:
				//      clear(buf)
				//      continue
				//
				//  if let Some(event) = resolve_writable_event(event, local_name):
				//      if let Some(pending_event) = pending_events.get(field):
				//          write_event(pending_event)
				//      write_event(event)
				//  else:
				//      pending_events.remove(field)
				//      is_dropping_element = true
			},
			Ok(Event::End(bytes)) => {
				//  if is_dropping_element:
				//      is_dropping_element = false
				//      clear(buf)
				//      continue
				//
				//  else:
				//      write_event(event)
			},
			Ok(Event::Eof) => break,
			Err(error) => {
				tracing::error!(?error, "Error encountered while parsing XML");
				break;
			},
			_ => unimplemented!(),
		}
	}

	// loop {
	// 	match reader.read_event_into(&mut buf) {
	// 		Ok(Event::Start(e)) => {
	// 			let tag = String::from_utf8_lossy(e.local_name().as_ref()).to_string();
	// 			current_tag = tag.clone();
	// 			empty_field = true;

	// 			// 1. if we have a value in metadata and it is Some:
	// 			//      - if html, read + write full content
	// 			//      - write the event using value from event
	// 			//      - mark as visited
	// 			// 2. we have a value in metadata but it is None
	// 			//      - do nothing, because handled in start
	// 			// 3. non-stump managed, just writes the event
	// 			//
	// 			// ??:
	// 			// - how do we track visited (enough to strip prefix etc and parse attrs?)

	// 			// the problem:
	// 			// - dc:title
	// 			// - meta (title) -> attribute `name="title"`
	// 			// ^ --> title
	// 			// - dc:title {title: title, dc:title: title}
	// 			// case where we need to rm it since nullish in db
	// 			//
	// 			// why track attrs
	// 			// - i need to check attrs so i know the stump metadata field
	// 			//      - e.g., tag(dc:identifier) + attr(opf:scheme) -> identifier_{attr_value}
	// 			// - when reading, checking this for visited is fine
	// 			// - when at the end, missing items, how do I write them?
	// 			//      - e.g., let's say I am missing identifier_google
	// 			//      - ^ i need to know to write <dc:identifier opf:scheme="GOOGLE">{event.text}</dc:identifier>
	// 			//

	// 			// when i read, i need to be able to determine a tag+attr combo = metadat field so that i can mark it as visited
	// 			// when i write, i need to be able to determine FOR MISSING ITEMS (not visited) the tag+attr combo from the metadata_field

	// 			// let base_tag =
	// 			// 	tag.strip_prefix("dc:").unwrap_or(tag.as_str()).to_string();

	// 			// let local_name = e.local_name()

	// 			// TODO: account for tags like 'subject' with multiple tags with a single value each
	// 			// TODO: track visiting later

	// 			// let base_tag = tag_name
	// 			// 	.strip_prefix("dc:")
	// 			// 	.unwrap_or(tag_name.as_str())
	// 			// 	.to_string();
	// 			// if HTML_CONTENT_TAGS.contains(&base_tag.as_str()) {
	// 			// 	html_tag_to_read = Some((tag_name, base_tag));
	// 			// } else {
	// 			// 	current_tag = base_tag.clone();

	// 			// for attr in e.attributes().flatten() {
	// 			// 	match attr.key.as_ref() {
	// 			// 		b"opf:scheme" if base_tag == "identifier" => {
	// 			// 			let scheme =
	// 			// 				String::from_utf8_lossy(&attr.value).to_lowercase();
	// 			// 			struct_field = format!("identifier_{}", scheme);
	// 			// 		},
	// 			// 		b"name" if tag == "meta" => {
	// 			// 			let name = String::from_utf8_lossy(&attr.value);
	// 			// 			struct_field =
	// 			// 				name.trim_start_matches("calibre:").to_string();
	// 			// 		},
	// 			// 		b"property" if tag == "meta" => {
	// 			// 			let property = String::from_utf8_lossy(&attr.value);
	// 			// 			struct_field = property.to_string();
	// 			// 		},
	// 			// 		b"property" if tag == "opf:meta" => {
	// 			// 			let property = String::from_utf8_lossy(&attr.value);
	// 			// 			struct_field = property.to_string();
	// 			// 		},
	// 			// 		_ => {},
	// 			// 	}
	// 			// }
	// 			if let Some(None) = metadata_map.get(struct_field.as_str()) {
	// 				visited.insert(tag.clone());
	// 			} else {
	// 				// otherwise write the start tag
	// 				writer.write_event(Event::Start(e))?;
	// 			}
	// 		},
	// 		Ok(Event::Empty(e)) => {
	// 			let tag = String::from_utf8_lossy(e.name().as_ref()).to_string();

	// 			let mut value_attr: Option<String> = None;

	// 			// <meta content="My Series Title" name="calibre:series" />

	// 			// handle meta or opf:meta a little diff:

	// 			if tag == "meta" ||dtag == "opf:meta" {
	// 				let inner_e = e.clone();
	// 				let attrs = inner_e.attributes();
	// 				let attributes: Vec<_> = attrs.flatten().collect();

	// 				let mut metadata_field = String::new();

	// 				for attr in attributes.iter() {
	// 					match (attr.key.as_ref(), attr.value.as_ref()) {
	// 						(b"name", b"calibre:series") if tag == "meta" => {
	// 							metadata_field = "series".to_string();
	// 							// TODO: if interchangeable (i.e., accept content OR value) then needs to be
	// 							// an array, and change to something like:
	// 							// if v.iter().map(|key| key.as_bytes()).includes(key)
	// 							value_attr = Some("content".to_string());
	// 						},
	// 						// todo: other named pairs?
	// 						_ => {},
	// 					}
	// 				}

	// 				let updated_attrs: Vec<Attribute<'_>> = attributes
	// 					.into_iter()
	// 					.filter_map(|attr| {
	// 						match (value_attr.as_deref(), attr.key.clone().as_ref()) {
	// 							(Some(v), key) if v.as_bytes() == key => {
	// 								match metadata_map.get(metadata_field.as_str()) {
	// 									// have a value and set, set it
	// 									Some(Some(metadata_value)) => {
	// 										Some(Attribute::from((
	// 											attr.key.into_inner(),
	// 											metadata_value.as_bytes(),
	// 										)))
	// 									},
	// 									// have a value and unset, unset it
	// 									Some(None) => None,
	// 									// not managed by Stump
	// 									None => Some(attr),
	// 								}
	// 							},
	// 							_ => Some(attr),
	// 						}
	// 					})
	// 					.collect();

	// 				let mut inner_e = e.clone();
	// 				let bytes_start = inner_e
	// 					.clear_attributes()
	// 					.to_owned()
	// 					.with_attributes(updated_attrs);
	// 				writer.write_event(Event::Empty(bytes_start))?;
	// 			} else {
	// 				writer.write_event(Event::Empty(e))?;
	// 			}

	// 			// 1. if we have a value in metadata and it is Some:
	// 			//      - create start/end
	// 			// 2. we have a value in metadata but it is None
	// 			//      - do nothing, because handled in start
	// 			// 3. non-stump managed, just writes the event

	// 			// if tag_name == "meta" {
	// 			// 	let mut meta_name = String::new();
	// 			// 	let mut meta_content = String::new();

	// 			// 	for attr in e.attributes().flatten() {
	// 			// 		match attr.key.as_ref() {
	// 			// 			b"name" => {
	// 			// 				let name = String::from_utf8_lossy(&attr.value);
	// 			// 				meta_name =
	// 			// 					name.trim_start_matches("calibre:").to_string();
	// 			// 			},
	// 			// 			b"property" => {
	// 			// 				let property = String::from_utf8_lossy(&attr.value);
	// 			// 				meta_name = property.to_string();
	// 			// 			},
	// 			// 			b"content" => {
	// 			// 				meta_content = String::from_utf8_lossy(&attr.value)
	// 			// 					.trim()
	// 			// 					.to_string();
	// 			// 			},
	// 			// 			_ => {},
	// 			// 		}
	// 			// 	}

	// 			// 	if !meta_name.is_empty() && !meta_content.is_empty() {
	// 			// 		tracing::trace!(?meta_name, ?meta_content, "Found meta tag");
	// 			// 		opf_metadata
	// 			// 			.entry(meta_name)
	// 			// 			.or_default()
	// 			// 			.push(meta_content);
	// 			// 	}
	// 			// } else {
	// 			// 	let base_tag = tag_name
	// 			// 		.strip_prefix("dc:")
	// 			// 		.unwrap_or(tag_name.as_str())
	// 			// 		.to_string();

	// 			// 	let mut tag_key = base_tag.clone();
	// 			// 	let mut tag_content = String::new();

	// 			// 	for attr in e.attributes().flatten() {
	// 			// 		match attr.key.as_ref() {
	// 			// 			b"opf:scheme" if base_tag == "identifier" => {
	// 			// 				let scheme =
	// 			// 					String::from_utf8_lossy(&attr.value).to_lowercase();
	// 			// 				tag_key = format!("identifier_{}", scheme);
	// 			// 			},
	// 			// 			b"content" => {
	// 			// 				tag_content = String::from_utf8_lossy(&attr.value)
	// 			// 					.trim()
	// 			// 					.to_string();
	// 			// 			},
	// 			// 			_ => {},
	// 			// 		}
	// 			// 	}

	// 			// 	if !tag_key.is_empty() && !tag_content.is_empty() {
	// 			// 		opf_metadata.entry(tag_key).or_default().push(tag_content);
	// 			// 	}
	// 		},
	// 		Ok(Event::Text(e)) => {
	// 			empty_field = false;

	// 			// 1. if we have a value in metadata and it is Some:
	// 			//      - if html, read + write full content
	// 			//      - write the event using value from event
	// 			//      - mark as visited
	// 			// 2. we have a value in metadata but it is None
	// 			//      - do nothing, because handled in start
	// 			// 3. non-stump managed, just writes the event
	// 			//
	// 			// ??:
	// 			// - how do we track visited (enough to strip prefix etc and parse attrs?)
	// 			// -

	// 			// if !current_tag.is_empty() {
	// 			// 	let text = String::from_utf8_lossy(&e).to_string();
	// 			// 	let content = text.trim().to_string();
	// 			// 	if !content.is_empty() {
	// 			// 		match current_tag.as_str() {
	// 			// 			"belongs-to-collection" => {
	// 			// 				opf_metadata
	// 			// 					.entry("collection_name".to_string())
	// 			// 					.or_default()
	// 			// 					.push(content.clone());
	// 			// 			},
	// 			// 			"collection-type" => {
	// 			// 				opf_metadata
	// 			// 					.entry("collection_type".to_string())
	// 			// 					.or_default()
	// 			// 					.push(content.clone());
	// 			// 			},
	// 			// 			"group-position" => {
	// 			// 				opf_metadata
	// 			// 					.entry("collection_position".to_string())
	// 			// 					.or_default()
	// 			// 					.push(content.clone());
	// 			// 			},
	// 			// 			"identifier" => {
	// 			// 				// Some books seem to have prefixed identifiers (e.g., "isbn:9780062444134")
	// 			// 				if let Some(colon_pos) = content.find(':') {
	// 			// 					let scheme = content[..colon_pos].to_lowercase();
	// 			// 					let value = content[colon_pos + 1..].to_string();
	// 			// 					let key = format!("identifier_{}", scheme);
	// 			// 					opf_metadata.entry(key).or_default().push(value);
	// 			// 				} else {
	// 			// 					// No prefix, treat as generic identifier
	// 			// 					opf_metadata
	// 			// 						.entry(current_tag.clone())
	// 			// 						.or_default()
	// 			// 						.push(content);
	// 			// 				}
	// 			// 			},
	// 			// 			_ => {
	// 			// 				opf_metadata
	// 			// 					.entry(current_tag.clone())
	// 			// 					.or_default()
	// 			// 					.push(content);
	// 			// 			},
	// 			// 		}
	// 			// 	}
	// 			// }
	// 		},
	// 		Ok(Event::End(_)) => {
	// 			current_tag.clear();
	// 		},
	// 		Ok(Event::Eof) => break,
	// 		Err(e) => {
	// 			tracing::warn!("Error parsing OPF XML: {}", e);
	// 			break;
	// 		},
	// 		_ => {},
	// 	}

	// 	// if let Some((full_tag, base_tag)) = html_tag_to_read.take() {
	// 	// 	let end = quick_xml::events::BytesEnd::new(&full_tag);
	// 	// 	match reader.read_text(end.name()) {
	// 	// 		Ok(raw_text) => {
	// 	// 			let text = unescape(&raw_text)
	// 	// 				.map(|c| c.into_owned())
	// 	// 				.unwrap_or_else(|_| raw_text.into_owned());
	// 	// 			let trimmed = text.trim().to_string();

	// 	// 			if !trimmed.is_empty() {
	// 	// 				opf_metadata.entry(base_tag).or_default().push(trimmed);
	// 	// 			}
	// 	// 		},
	// 	// 		Err(e) => {
	// 	// 			tracing::warn!("Error reading {} content: {}", base_tag, e);
	// 	// 		},
	// 	// 	}
	// 	// }

	// 	buf.clear();
	// }

	unimplemented!()
}

// <dc:identifier opf:scheme="GOOGLE">{identifier_google}</dc:identifier>
// dc:identifier.opf:scheme.GOOGLE -> identifier_google

fn build_opf_tag_map() -> HashMap<&'static str, String> {
	let mut map = HashMap::new();

	map
}

fn normalize_metadata_key(key: &str) -> &str {
	match key {
		"collection_name" => "series",
		"series_index" | "collection_position" => "number",
		"creator" | "author" => "writers",
		"genre" | "subject" | "subjects" => "genres",
		"tag" => "tags",
		"description" | "synopsis" => "summary",
		"identifier_mobi-asin" => "identifier_mobi_asin",
		_ => key,
	}
}

// TODO: consider leaning into serde for this instead of manually constructing a hashmap
// i can imagine something like:
// ```rust
// let mut metadata_map = metadata.to_json()
// metadat_map["tags"] = existing_tags.clone()
// return metadata_map
// ```
// and then we just use Value accessors as needed and coerce things into strings
// e.g.
//
// fn get_value(metadata_map: &Value, key: &str) -> Option<String>
// let value = metadata_map.get(key)
// etc
fn build_metadata_value_map(
	metadata: media_metadata::Model,
	existing_tags: Vec<String>,
) -> HashMap<&'static str, Option<String>> {
	let mut map = HashMap::new();
	map.insert("title", metadata.title.clone());
	map.insert("title_sort", metadata.title_sort.clone());
	map.insert("series", metadata.series.clone());
	map.insert("number", metadata.number.clone().map(|x| x.to_string()));
	map.insert("volume", metadata.volume.clone().map(|x| x.to_string()));
	map.insert("summary", metadata.summary.clone());
	map.insert("notes", metadata.notes.clone());
	map.insert("genre", metadata.genres.clone());
	map.insert(
		"tag",
		if existing_tags.is_empty() {
			None
		} else {
			Some(existing_tags.join(","))
		},
	);
	map.insert("year", metadata.year.clone().map(|x| x.to_string()));
	map.insert("month", metadata.month.clone().map(|x| x.to_string()));
	map.insert("day", metadata.day.clone().map(|x| x.to_string()));
	map.insert("language", metadata.language.clone());
	map.insert("identifier_amazon", metadata.identifier_amazon.clone());
	map.insert("identifier_calibre", metadata.identifier_calibre.clone());
	map.insert("identifier_google", metadata.identifier_google.clone());
	map.insert("identifier_isbn", metadata.identifier_isbn.clone());
	map.insert(
		"indentifier_mobi_asin",
		metadata.identifier_mobi_asin.clone(),
	);
	map.insert("identifier_uuid", metadata.identifier_uuid.clone());
	map.insert("pencillers", metadata.pencillers.clone());
	map.insert("inkers", metadata.inkers.clone());
	map.insert("colorists", metadata.colorists.clone());
	map.insert("letterers", metadata.letterers.clone());
	map.insert("coverartists", metadata.cover_artists.clone());
	map.insert("editors", metadata.editors.clone());
	map.insert("publisher", metadata.publisher.clone());
	map.insert("links", metadata.links.clone());
	map.insert("characters", metadata.characters.clone());
	map.insert("teams", metadata.teams.clone());
	map.insert(
		"pagecount",
		metadata.page_count.clone().map(|x| x.to_string()),
	);

	let date = match (metadata.year, metadata.month, metadata.day) {
		(Some(y), Some(m), maybe_day) => {
			let day = maybe_day.unwrap_or(1);
			NaiveDate::from_ymd_opt(y, m as u32, day as u32).map(|nd| nd.to_string())
		},
		_ => None,
	};
	map.insert("date", date);
	map.insert("writers", metadata.writers.clone());
	// TODO: today age restrictions are one-way, i.e. we know what to do when encountering
	// e.g. a rating of "G" but cannot assume the other direction when writing back because we
	// store numbers.
	// map.insert(
	// 	"typicalagerange",
	// 	metadata.age_rating.clone().map(|x| x.to_string()),
	// );
	map
}

fn resolve_writable_start_event<'a>(
	bytes: BytesStart<'_>,
	local_name: &str,
	metadata: HashMap<&str, Option<String>>,
) -> Option<BytesStart<'a>> {
	if local_name != "meta" {
		// TODO: might be wrong
		return None;
	}

	let mut name = None;
	let mut content = None;
	let mut property = None;

	for attr in bytes.attributes().flatten() {
		match attr.key.as_ref() {
			b"name" => {
				let value_str = String::from_utf8_lossy(&attr.value);
				name = Some(value_str.trim_start_matches("calibre:").to_string());
			},
			b"property" => {
				property = Some(String::from_utf8_lossy(&attr.value).trim().to_string())
			},
			b"content" => {
				content = Some(String::from_utf8_lossy(&attr.value).trim().to_string());
			},
			_ => {},
		}
	}

	// what we look up in map (perhaps via normalize_metadata_key as well)
	let effective_name = name.clone().or(property.clone());

	//

	None
}

// 			if tag == "meta" ||dtag == "opf:meta" {
// 				let inner_e = e.clone();
// 				let attrs = inner_e.attributes();
// 				let attributes: Vec<_> = attrs.flatten().collect();

// 				let mut metadata_field = String::new();

// 				for attr in attributes.iter() {
// 					match (attr.key.as_ref(), attr.value.as_ref()) {
// 						(b"name", b"calibre:series") if tag == "meta" => {
// 							metadata_field = "series".to_string();
// 							// TODO: if interchangeable (i.e., accept content OR value) then needs to be
// 							// an array, and change to something like:
// 							// if v.iter().map(|key| key.as_bytes()).includes(key)
// 							value_attr = Some("content".to_string());
// 						},
// 						// todo: other named pairs?
// 						_ => {},
// 					}
// 				}

// 				let updated_attrs: Vec<Attribute<'_>> = attributes
// 					.into_iter()
// 					.filter_map(|attr| {
// 						match (value_attr.as_deref(), attr.key.clone().as_ref()) {
// 							(Some(v), key) if v.as_bytes() == key => {
// 								match metadata_map.get(metadata_field.as_str()) {
// 									// have a value and set, set it
// 									Some(Some(metadata_value)) => {
// 										Some(Attribute::from((
// 											attr.key.into_inner(),
// 											metadata_value.as_bytes(),
// 										)))
// 									},
// 									// have a value and unset, unset it
// 									Some(None) => None,
// 									// not managed by Stump
// 									None => Some(attr),
// 								}
// 							},
// 							_ => Some(attr),
// 						}
// 					})
// 					.collect();

// 				let mut inner_e = e.clone();
// 				let bytes_start = inner_e
// 					.clear_attributes()
// 					.to_owned()
// 					.with_attributes(updated_attrs);

//
//
// fn merge_opf_metadata(opf_string: OpfString, metadata: &Metadata, existing_tags: Vec<String>) -> Result<OpfString, CoreError> {
//      let mut reader = Reader::from_str(opf_string);
//      reader.config_mut().trim_text(true);
//      let mut buf = Vec::new();
//      let mut opf_metadata: HashMap<String, Vec<String>> = HashMap::new();
//      let mut writer = Writer::new(Vec::new());
//      let mut current_tag = String::default();
//      let mut visited = HashSet::<String>::new(); maybe not needed
//      let mut empty_field = false; also maybe not needed
//
//      let metadata_map = build_metadata_map(metadata.clone(), existing_tags.clone())
//
//      const HTML_CONTENT_TAGS: [&str; 3] = ["description", "summary", "synopsis"];
//
//      loop {
//          let mut html_tag_to_read: Option <(String, String)> = None;
//
//          match reader.read_event_into(&mut buf) {
//              Ok(Event::Start(e)) -> {
//                  let tag = e.to_string();
//                  let base_tag = tag
//					.strip_prefix("dc:")
//					.unwrap_or(tag_name.as_str())
//					.to_string();
//                  if HTML_CONTENT_TAGS.contains(&base_tag.as_str()) {
//					    html_tag_to_read = Some((tag_name, base_tag));
//				    } else {
//					current_tag = base_tag.clone();
//                  empty_field = true;
//                  if let Some(None) = metadata_map.get(base_tag.as_str()) {
//                      visited.insert(base_tag.clone());
//                  } else {
//                      writer.write_event(Event::Start(e))?;
//
// }
//
// the reason this will be more laborous than comic info is because of:
// - less standardized meta(?)
// - the usage of attributes, which comic info xml does not have really much of
