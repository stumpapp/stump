use rocket_okapi::JsonSchema;
use serde::{Deserialize, Serialize};

use crate::prisma;

#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema)]
#[serde(rename_all = "camelCase")]
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
