use std::collections::HashMap;

use serde::{Deserialize, Deserializer, Serialize};
use specta::Type;
use utoipa::ToSchema;

use crate::prisma::{media_metadata, series_metadata};

fn string_list_deserializer<'de, D>(
	deserializer: D,
) -> Result<Option<Vec<String>>, D::Error>
where
	D: Deserializer<'de>,
{
	let str_sequence = String::deserialize(deserializer)?;
	Ok(Some(
		str_sequence
			.split(',')
			.map(|item| item.trim().to_owned())
			.collect(),
	))
}

/*
   TODO: write A proc macro that is shorthand for:

   #[serde(
	   alias = INPUT
	   deserialize_with = "string_list_deserializer",
	   default = "Option::default"
   )]

   So I can do this:
   #[string_list(alias = "Genre")]
   pub genre: Option<Vec<String>>,

   Something like:

   #[macro_export]
	macro_rules! string_list {
		(alias = $alias:literal) => {
			#[serde(
				alias = $alias,
				deserialize_with = "string_list_deserializer",
				default = "Option::default"
			)]
		};
	}
*/

// NOTE: alias is used primarily to support ComicInfo.xml files, as that metadata
// is formatted in PascalCase
/// Struct representing the metadata for a processed file.
#[derive(
	Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Type, Default, ToSchema,
)]
pub struct MediaMetadata {
	/// The title of the media.
	#[serde(alias = "Title")]
	pub title: Option<String>,
	// TODO: sync?
	/// The series name which the media belongs to. This isn't necessarily the same as the
	/// series name as it was interpreted by Stump.
	#[serde(alias = "Series")]
	pub series: Option<String>,
	#[serde(alias = "Number")]
	pub number: Option<i32>,
	#[serde(alias = "Volume")]
	pub volume: Option<i32>,
	/// The summary of the media.
	#[serde(alias = "Summary")]
	pub summary: Option<String>,
	/// Optional notes about the media.
	#[serde(alias = "Notes")]
	pub notes: Option<String>,
	/// The genre(s) the media belongs to.
	#[serde(
		alias = "Genre",
		deserialize_with = "string_list_deserializer",
		default = "Option::default"
	)]
	pub genre: Option<Vec<String>>,

	/// The year the media was published.
	#[serde(alias = "Year")]
	pub year: Option<i32>,
	/// The month the media was published (1-12)
	#[serde(alias = "Month")]
	pub month: Option<i32>,
	/// The day the media was published (1-31). The day is not validated against the month.
	#[serde(alias = "Day")]
	pub day: Option<i32>,

	/// The writer(s) of the associated media
	#[serde(
		alias = "Writer",
		deserialize_with = "string_list_deserializer",
		default = "Option::default"
	)]
	pub writers: Option<Vec<String>>,
	/// The penciller(s) of the associated media
	#[serde(
		alias = "Penciller",
		deserialize_with = "string_list_deserializer",
		default = "Option::default"
	)]
	pub pencillers: Option<Vec<String>>,
	/// The inker(s) of the associated media
	#[serde(
		alias = "Inker",
		deserialize_with = "string_list_deserializer",
		default = "Option::default"
	)]
	pub inkers: Option<Vec<String>>,
	/// The colorist(s) of the associated media
	#[serde(
		alias = "Colorist",
		deserialize_with = "string_list_deserializer",
		default = "Option::default"
	)]
	pub colorists: Option<Vec<String>>,
	/// The letterer(s) of the associated media
	#[serde(
		alias = "Letterer",
		deserialize_with = "string_list_deserializer",
		default = "Option::default"
	)]
	pub letterers: Option<Vec<String>>,
	/// The cover artist(s) of the associated media
	#[serde(
		alias = "CoverArtist",
		deserialize_with = "string_list_deserializer",
		default = "Option::default"
	)]
	pub cover_artists: Option<Vec<String>>,
	/// The editor(s) of the associated media
	#[serde(
		alias = "Editor",
		deserialize_with = "string_list_deserializer",
		default = "Option::default"
	)]
	pub editors: Option<Vec<String>>,
	/// The publisher of the associated media
	#[serde(alias = "Publisher")]
	pub publisher: Option<String>,

	/// Link(s) to the associated media, e.g. a comixology link
	#[serde(
		alias = "Web",
		deserialize_with = "string_list_deserializer",
		default = "Option::default"
	)]
	pub links: Option<Vec<String>>,
	/// A list of characters that appear in the associated media
	#[serde(
		alias = "Characters",
		deserialize_with = "string_list_deserializer",
		default = "Option::default"
	)]
	pub characters: Option<Vec<String>>,
	/// A list of teams that appear in the associated media
	#[serde(
		alias = "Teams",
		deserialize_with = "string_list_deserializer",
		default = "Option::default"
	)]
	pub teams: Option<Vec<String>>,

	/// The number of pages in the associated media. This does *not* take priority over
	/// the number of pages detected by the file processor.
	#[serde(alias = "PageCount")]
	pub page_count: Option<i32>,
	// TODO: pages, e.g. <Pages><Page Image="0" Type="FrontCover" ImageSize="741291" /></Pages>
}

impl MediaMetadata {
	pub fn create_action(self) -> Vec<media_metadata::SetParam> {
		vec![
			media_metadata::title::set(self.title),
			media_metadata::series::set(self.series),
			media_metadata::number::set(self.number),
			media_metadata::volume::set(self.volume),
			media_metadata::summary::set(self.summary),
			media_metadata::notes::set(self.notes),
			media_metadata::genre::set(self.genre.map(|v| v.join(", "))),
			media_metadata::year::set(self.year),
			media_metadata::month::set(self.month),
			media_metadata::day::set(self.day),
			media_metadata::writers::set(self.writers.map(|v| v.join(", "))),
			media_metadata::pencillers::set(self.pencillers.map(|v| v.join(", "))),
			media_metadata::inkers::set(self.inkers.map(|v| v.join(", "))),
			media_metadata::colorists::set(self.colorists.map(|v| v.join(", "))),
			media_metadata::letterers::set(self.letterers.map(|v| v.join(", "))),
			media_metadata::cover_artists::set(self.cover_artists.map(|v| v.join(", "))),
			media_metadata::editors::set(self.editors.map(|v| v.join(", "))),
			media_metadata::publisher::set(self.publisher),
			media_metadata::links::set(self.links.map(|v| v.join(", "))),
			media_metadata::characters::set(self.characters.map(|v| v.join(", "))),
			media_metadata::teams::set(self.teams.map(|v| v.join(", "))),
			media_metadata::page_count::set(self.page_count),
		]
	}
}

#[derive(Debug, Clone, Deserialize, Serialize, Type, ToSchema)]
pub struct SeriesMetadata {
	/// The type of series. ex: "comicSeries"
	#[serde(alias = "type")]
	pub _type: String,
	/// The title of the series, renamed from 'name' to keep consistency with the rest of the models
	pub title: Option<String>,
	/// The associated series' description, renamed from 'description' to keep consistency with the rest of the models
	pub summary: Option<String>,
	/// The publisher of the associated series
	pub publisher: Option<String>,
	/// The name of the imprint while under the publisher
	pub imprint: Option<String>,
	/// The ComicVine id of the associated series
	pub comicid: Option<i32>,
	/// The volume of the series in relation to other titles (this can be either numerical or the series year)
	pub volume: Option<i32>,
	/// The booktype of the series, e.g. Print, OneShot, TPB or GN
	pub booktype: Option<String>,
	/// The age rating of the associated series
	pub age_rating: Option<String>,
	/// The status of the associated series, e.g. Continuing, Ended
	pub status: Option<String>,
}

pub type SeriesMetadataCreateAction = (String, Vec<series_metadata::SetParam>);

impl SeriesMetadata {
	pub fn create_action(self) -> (String, Vec<series_metadata::SetParam>) {
		(
			self._type,
			vec![
				series_metadata::title::set(self.title),
				series_metadata::summary::set(self.summary),
				series_metadata::publisher::set(self.publisher),
				series_metadata::imprint::set(self.imprint),
				series_metadata::comicid::set(self.comicid),
				series_metadata::volume::set(self.volume),
				series_metadata::booktype::set(self.booktype),
				series_metadata::age_rating::set(self.age_rating),
				series_metadata::status::set(self.status),
			],
		)
	}
}

///////////////////////////////////////////////
////////////////// CONVERSIONS ////////////////
///////////////////////////////////////////////

fn comma_separated_list_to_vec(vec: String) -> Vec<String> {
	vec.split(',').map(|v| v.trim().to_owned()).collect()
}

impl From<media_metadata::Data> for MediaMetadata {
	fn from(metadata: media_metadata::Data) -> Self {
		MediaMetadata {
			title: metadata.title,
			series: metadata.series,
			number: metadata.number,
			volume: metadata.volume,
			summary: metadata.summary,
			notes: metadata.notes,
			genre: metadata.genre.map(comma_separated_list_to_vec),
			year: metadata.year,
			month: metadata.month,
			day: metadata.day,
			writers: metadata.writers.map(comma_separated_list_to_vec),
			pencillers: metadata.pencillers.map(comma_separated_list_to_vec),
			inkers: metadata.inkers.map(comma_separated_list_to_vec),
			colorists: metadata.colorists.map(comma_separated_list_to_vec),
			letterers: metadata.letterers.map(comma_separated_list_to_vec),
			cover_artists: metadata.cover_artists.map(comma_separated_list_to_vec),
			editors: metadata.editors.map(comma_separated_list_to_vec),
			publisher: metadata.publisher,
			links: metadata.links.map(comma_separated_list_to_vec),
			characters: metadata.characters.map(comma_separated_list_to_vec),
			teams: metadata.teams.map(comma_separated_list_to_vec),
			page_count: metadata.page_count,
		}
	}
}

// NOTE: this is primarily used for converting the EPUB metadata into a common Metadata struct
impl From<HashMap<String, Vec<String>>> for MediaMetadata {
	fn from(map: HashMap<String, Vec<String>>) -> Self {
		let mut metadata = MediaMetadata::default();

		for (key, value) in map {
			match key.to_lowercase().as_str() {
				"title" => metadata.title = Some(value.join("\n").to_string()),
				"series" => metadata.series = Some(value.join("\n").to_string()),
				"number" => {
					metadata.number =
						value.into_iter().next().and_then(|n| n.parse().ok())
				},
				"volume" => {
					metadata.volume =
						value.into_iter().next().and_then(|n| n.parse().ok())
				},
				"summary" => metadata.summary = Some(value.join("\n").to_string()),
				"notes" => metadata.notes = Some(value.join("\n").to_string()),
				"genre" => metadata.genre = Some(value),
				"year" => {
					metadata.year = value.into_iter().next().and_then(|n| n.parse().ok())
				},
				"month" => {
					metadata.month = value.into_iter().next().and_then(|n| n.parse().ok())
				},
				"day" => {
					metadata.day = value.into_iter().next().and_then(|n| n.parse().ok())
				},
				"writers" => metadata.writers = Some(value),
				"pencillers" => metadata.pencillers = Some(value),
				"inkers" => metadata.inkers = Some(value),
				"colorists" => metadata.colorists = Some(value),
				"letterers" => metadata.letterers = Some(value),
				"coverartists" => metadata.cover_artists = Some(value),
				"editors" => metadata.editors = Some(value),
				"publisher" => metadata.publisher = Some(value.join("\n").to_string()),
				"links" => metadata.links = Some(value),
				"characters" => metadata.characters = Some(value),
				"teams" => metadata.teams = Some(value),
				"pagecount" => {
					metadata.page_count =
						value.into_iter().next().and_then(|n| n.parse().ok())
				},
				_ => (),
			}
		}

		metadata
	}
}

impl From<series_metadata::Data> for SeriesMetadata {
	fn from(metadata: series_metadata::Data) -> Self {
		SeriesMetadata {
			_type: metadata.meta_type,
			title: metadata.title,
			summary: metadata.summary,
			publisher: metadata.publisher,
			imprint: metadata.imprint,
			comicid: metadata.comicid,
			volume: metadata.volume,
			booktype: metadata.booktype,
			age_rating: metadata.age_rating,
			status: metadata.status,
		}
	}
}
