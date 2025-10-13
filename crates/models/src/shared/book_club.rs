use std::collections::HashMap;

use async_graphql::{Enum, InputObject, SimpleObject};
use sea_orm::{DeriveActiveEnum, EnumIter, FromJsonQueryResult};
use serde::{Deserialize, Serialize};
use strum::Display;

/// The visibility of a shareable entity
#[derive(
	Eq,
	Copy,
	Hash,
	Debug,
	Clone,
	Default,
	EnumIter,
	PartialEq,
	Serialize,
	Deserialize,
	DeriveActiveEnum,
	Enum,
	Display,
	PartialOrd,
	Ord,
)]
#[sea_orm(
	rs_type = "String",
	rename_all = "SCREAMING_SNAKE_CASE",
	db_type = "Integer"
)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
#[strum(serialize_all = "SCREAMING_SNAKE_CASE")]
pub enum BookClubMemberRole {
	#[default]
	Member = 0, // default, read-only access
	Moderator = 1, // can delete messages
	Admin = 2,     // can add/remove members, change schedule, etc.
	Creator = 3,   // can delete the book club, change name, etc.
}

impl From<i32> for BookClubMemberRole {
	fn from(val: i32) -> Self {
		match val {
			0 => BookClubMemberRole::Member,
			1 => BookClubMemberRole::Moderator,
			2 => BookClubMemberRole::Admin,
			3 => BookClubMemberRole::Creator,
			_ => BookClubMemberRole::Member,
		}
	}
}

// A map of [BookClubMemberRole] to a [String] representing the club-specific
// name for a role
#[derive(Debug, Clone, Deserialize, Serialize, PartialEq, Eq, FromJsonQueryResult)]
#[serde(transparent)]
pub struct BookClubMemberRoleSpec(HashMap<BookClubMemberRole, String>);
impl Default for BookClubMemberRoleSpec {
	fn default() -> Self {
		let mut map = HashMap::new();
		map.insert(BookClubMemberRole::Member, "Member".to_string());
		map.insert(BookClubMemberRole::Moderator, "Moderator".to_string());
		map.insert(BookClubMemberRole::Admin, "Admin".to_string());
		map.insert(BookClubMemberRole::Creator, "Creator".to_string());
		Self(map)
	}
}

#[derive(
	Debug,
	Clone,
	Deserialize,
	Serialize,
	PartialEq,
	Eq,
	SimpleObject,
	InputObject,
	FromJsonQueryResult,
)]
#[graphql(input_name = "BookClubExternalBookInput")]
pub struct BookClubExternalBook {
	// The title of the book
	pub title: String,
	// The author of the book
	pub author: String,
	// The URL to the book's page, purchase page, etc.
	pub url: Option<String>,
	// The URL to the book's cover image
	pub image_url: Option<String>,
}

#[derive(
	Debug, Clone, Deserialize, Serialize, PartialEq, Eq, SimpleObject, InputObject,
)]
#[graphql(input_name = "BookClubInternalBookInput")]
pub struct BookClubInternalBook {
	pub id: String,
}
