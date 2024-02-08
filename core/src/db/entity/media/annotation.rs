use serde::{Deserialize, Serialize};
use specta::Type;
use utoipa::ToSchema;

use crate::{db::entity::Media, prisma::media_annotation};

#[derive(Debug, Clone, Deserialize, Serialize, Type, Default, ToSchema)]
pub struct MediaAnnotation {
	id: String,
	// The text that was highlighted, if any
	highlighted_text: Option<String>,
	/// The page number of the annotation. This is a 1-based index for image-based media
	page: Option<i32>,
	/// The x coordinate of the annotation on the page. This is a percentage of the page width
	page_coordinates_x: Option<f64>,
	/// The y coordinate of the annotation on the page. This is a percentage of the page height
	page_coordinates_y: Option<f64>,
	/// The epubcfi associated with the annotation. This can be a range or a single point,
	/// where a range can be inferred as highlighted text
	epubcfi: Option<String>,
	/// The user notes for the annotation. ex: "This is a note"
	notes: Option<String>,
	// The media this annotation belongs to
	media_id: String,
	#[serde(skip_serializing_if = "Option::is_none")]
	#[specta(optional)]
	media: Option<Media>,
}

impl From<media_annotation::Data> for MediaAnnotation {
	fn from(data: media_annotation::Data) -> Self {
		let media = match data.media() {
			Ok(media) => Some(Media::from(media.to_owned())),
			Err(_) => None,
		};

		MediaAnnotation {
			id: data.id,
			highlighted_text: data.highlighted_text,
			epubcfi: data.epubcfi,
			page: data.page,
			page_coordinates_x: data.page_coordinates_x,
			page_coordinates_y: data.page_coordinates_y,
			notes: data.notes,
			media_id: data.media_id,
			media,
		}
	}
}
