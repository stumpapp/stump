use schemars::JsonSchema;
use serde::{Deserialize, Serialize};
use specta::Type;

use crate::prisma;

#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema, Type)]
pub struct Tag {
	pub id: String,
	/// The name of the tag. ex: "comic"
	pub name: String,
}

impl Into<Tag> for prisma::tag::Data {
	fn into(self) -> Tag {
		Tag {
			id: self.id,
			name: self.name,
		}
	}
}
