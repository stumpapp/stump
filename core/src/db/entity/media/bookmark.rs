use serde::{Deserialize, Serialize};
use specta::Type;
use utoipa::ToSchema;

use crate::{db::entity::User, prisma::bookmark};

use super::Media;

/// A model representing a bookmark in the database. Bookmarks are used to save specific locations
/// in a media file, such as an epub, without any additional metadata like notes, tags, etc.
#[derive(Debug, Clone, Deserialize, Serialize, Type, ToSchema)]
pub struct Bookmark {
	/// The id of the bookmark
	id: String,

	/// The preview content of the bookmark, usually the text content of the first node in the CFI
	/// range
	preview_content: Option<String>,
	/// The position of the bookmark in the epub, represented by an epubcfi
	epubcfi: Option<String>,
	/// The position of the bookmark in the epub, represented by a page number
	page: Option<i32>,

	/// The id of the associated book
	book_id: String,
	/// The associated book. This relationship will always exist in the DB, however will not
	/// always be returned in the API response
	#[serde(skip_serializing_if = "Option::is_none")]
	#[specta(optional)]
	book: Option<Media>,

	/// The id of the associated user. This relationship will always exist in the DB, however will not
	/// always be returned in the API response
	#[serde(skip_serializing_if = "Option::is_none")]
	#[specta(optional)]
	user_id: Option<String>,
	/// The associated user
	#[serde(skip_serializing_if = "Option::is_none")]
	#[specta(optional)]
	user: Option<User>,
}

impl From<bookmark::Data> for Bookmark {
	fn from(data: bookmark::Data) -> Self {
		let book = data.media().map(|media| Media::from(media.to_owned())).ok();
		let user = data.user().map(|user| User::from(user.to_owned())).ok();

		let this = Self {
			id: data.id,
			preview_content: data.preview_content,
			epubcfi: data.epubcfi.filter(|epubcfi| !epubcfi.is_empty()),
			page: data.page.filter(|page| *page > 0),
			book_id: data.media_id,
			book,
			user_id: Some(data.user_id),
			user,
		};

		if this.epubcfi.is_none() && this.page.is_none() {
			tracing::warn!(bookmark=?this, "Bookmark has no epubcfi or page number");
		}

		this
	}
}
