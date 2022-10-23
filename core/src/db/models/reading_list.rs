use serde::{Deserialize, Serialize};
use specta::Type;

use crate::{db::models::Media, prisma::reading_list};

#[derive(Debug, Clone, Serialize, Deserialize, Type, Default)]
pub struct ReadingList {
	pub id: String,
	pub name: String,
	pub creating_user_id: String,
	pub description: Option<String>,
	pub media: Option<Vec<Media>>,
}

impl From<reading_list::Data> for ReadingList {
	fn from(data: reading_list::Data) -> ReadingList {
		ReadingList {
			id: data.id,
			name: data.name,
			creating_user_id: data.creating_user_id,
			description: data.description,
			media: None,
		}
	}
}
