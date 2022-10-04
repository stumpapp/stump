use serde::{Deserialize, Serialize};
use specta::Type;

use crate::prisma;

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct Tag {
	pub id: String,
	/// The name of the tag. ex: "comic"
	pub name: String,
}

impl From<prisma::tag::Data> for Tag {
	fn from(data: prisma::tag::Data) -> Tag {
		Tag {
			id: data.id,
			name: data.name,
		}
	}
}
