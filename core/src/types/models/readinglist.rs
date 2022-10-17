use serde::{Deserialize, Serialize};
use specta::Type;

use crate::prisma::{self};

// TODO
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct ReadingList {
	pub id: String,
	pub name: String,
	pub description: Option<String>,
}

impl From<prisma::reading_list::Data> for ReadingList {
	fn from(data: prisma::reading_list::Data) -> ReadingList {
		ReadingList {
			id: data.id,
			name: data.name,
			description: data.description,
		}
	}
}