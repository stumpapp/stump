use serde::{Deserialize, Serialize};
use specta::Type;
use utoipa::ToSchema;

use crate::prisma;

///////////////////////////////////////////////
//////////////////// MODELS ///////////////////
///////////////////////////////////////////////

#[derive(Debug, Clone, Serialize, Deserialize, Type, ToSchema)]
pub struct Tag {
	pub id: String,
	/// The name of the tag. ex: "comic"
	pub name: String,
}

pub type TagName = String;

//////////////////////////////////////////////
//////////////////// INPUTS //////////////////
//////////////////////////////////////////////

#[derive(Deserialize, Type, ToSchema)]
pub struct CreateTags {
	pub tags: Vec<String>,
}

///////////////////////////////////////////////
////////////////// CONVERSIONS ////////////////
///////////////////////////////////////////////

impl From<prisma::tag::Data> for Tag {
	fn from(data: prisma::tag::Data) -> Tag {
		Tag {
			id: data.id,
			name: data.name,
		}
	}
}
