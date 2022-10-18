use serde::{Deserialize, Serialize};
use specta::Type;

use crate::prisma::{self, media};

// TODO
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct ReadingList {
	pub id: String,
	pub name: String,
	pub creating_user_id: String,
	pub description: Option<String>,
}

impl From<prisma::reading_list::Data> for ReadingList {
	fn from(data: prisma::reading_list::Data) -> ReadingList {
		ReadingList {
			id: data.id,
			name: data.name,
			creating_user_id: data.creating_user_id,
			description: data.description,
		}
	}
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct CreateReadingList {
	pub id: String,
	pub media_ids: Vec<String>
}