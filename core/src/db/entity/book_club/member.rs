use serde::{Deserialize, Serialize};
use specta::Type;
use std::collections::HashMap;
use utoipa::ToSchema;

use crate::db::entity::User;

use super::{
	prisma_macros::{
		book_club_member_and_schedule_include, book_club_member_user_username,
		book_club_with_books_include,
	},
	BookClub,
};

#[derive(Default, Debug, Clone, Deserialize, Serialize, Type, ToSchema)]
pub struct BookClubMember {
	pub id: String,

	#[specta(optional)]
	pub display_name: Option<String>,
	pub is_creator: bool,
	pub hide_progress: bool,
	pub private_membership: bool,
	pub role: BookClubMemberRole,

	#[serde(skip_serializing_if = "Option::is_none")]
	pub user: Option<User>,
	#[serde(skip_serializing_if = "Option::is_none")]
	pub user_id: Option<String>,
	#[serde(skip_serializing_if = "Option::is_none")]
	pub book_club: Option<BookClub>,
}

#[derive(
	Default, Debug, Clone, Deserialize, Serialize, Type, ToSchema, PartialEq, Eq, Hash,
)]
pub enum BookClubMemberRole {
	#[default]
	#[serde(rename = "MEMBER")]
	MEMBER = 0, // default, read-only access
	#[serde(rename = "MODERATOR")]
	MODERATOR = 1, // can delete messages
	#[serde(rename = "ADMIN")]
	ADMIN = 2, // can add/remove members, change schedule, etc.
	#[serde(rename = "CREATOR")]
	CREATOR = 3, // can delete the book club, change name, etc.
}

impl From<i32> for BookClubMemberRole {
	fn from(val: i32) -> Self {
		match val {
			0 => BookClubMemberRole::MEMBER,
			1 => BookClubMemberRole::MODERATOR,
			2 => BookClubMemberRole::ADMIN,
			3 => BookClubMemberRole::CREATOR,
			_ => BookClubMemberRole::MEMBER,
		}
	}
}

// A map of [BookClubMemberRole] to a [String] representing the club-specific
// name for a role
#[derive(Debug, Clone, Deserialize, Serialize, Type, ToSchema)]
#[serde(transparent)]
pub struct BookClubMemberRoleSpec(HashMap<BookClubMemberRole, String>);
impl Default for BookClubMemberRoleSpec {
	fn default() -> Self {
		let mut map = HashMap::new();
		map.insert(BookClubMemberRole::MEMBER, "Member".to_string());
		map.insert(BookClubMemberRole::MODERATOR, "Moderator".to_string());
		map.insert(BookClubMemberRole::ADMIN, "Admin".to_string());
		map.insert(BookClubMemberRole::CREATOR, "Creator".to_string());
		Self(map)
	}
}

impl From<Vec<u8>> for BookClubMemberRoleSpec {
	fn from(value: Vec<u8>) -> Self {
		serde_json::from_slice(&value).unwrap_or_else(|error| {
			tracing::error!(error = ?error, "Failed to deserialize member_role_spec");
			Self::default()
		})
	}
}

impl From<BookClubMemberRoleSpec> for Vec<u8> {
	fn from(value: BookClubMemberRoleSpec) -> Self {
		serde_json::to_vec(&value).unwrap_or_else(|error| {
			tracing::error!(error = ?error, "Failed to serialize member_role_spec");
			vec![]
		})
	}
}

impl From<BookClubMemberRole> for i32 {
	fn from(val: BookClubMemberRole) -> Self {
		match val {
			BookClubMemberRole::MEMBER => 0,
			BookClubMemberRole::MODERATOR => 1,
			BookClubMemberRole::ADMIN => 2,
			BookClubMemberRole::CREATOR => 3,
		}
	}
}

impl From<book_club_member_user_username::members::Data> for BookClubMember {
	fn from(data: book_club_member_user_username::members::Data) -> BookClubMember {
		BookClubMember {
			id: data.id,
			display_name: data.display_name.or(Some(data.user.username)),
			is_creator: data.is_creator,
			hide_progress: data.hide_progress,
			private_membership: data.private_membership,
			role: data.role.into(),
			user_id: Some(data.user_id),
			..Default::default()
		}
	}
}

impl From<book_club_member_and_schedule_include::members::Data> for BookClubMember {
	fn from(
		data: book_club_member_and_schedule_include::members::Data,
	) -> BookClubMember {
		BookClubMember {
			id: data.id,
			display_name: data.display_name.or(Some(data.user.username)),
			is_creator: data.is_creator,
			hide_progress: data.hide_progress,
			private_membership: data.private_membership,
			role: data.role.into(),
			user_id: Some(data.user_id),
			..Default::default()
		}
	}
}

impl From<book_club_with_books_include::members::Data> for BookClubMember {
	fn from(data: book_club_with_books_include::members::Data) -> BookClubMember {
		BookClubMember {
			id: data.id,
			display_name: data.display_name.or(Some(data.user.username)),
			is_creator: data.is_creator,
			hide_progress: data.hide_progress,
			private_membership: data.private_membership,
			role: data.role.into(),
			user_id: Some(data.user_id),
			..Default::default()
		}
	}
}

#[cfg(test)]
mod tests {
	use super::*;

	#[test]
	fn deserialize_member_role_spec_from_str() {
		let spec = r#"{"MEMBER":"Member","MODERATOR":"Moderator","ADMIN":"Admin","CREATOR":"Creator"}"#;
		let spec: BookClubMemberRoleSpec = serde_json::from_str(spec).unwrap();
		assert_eq!(spec.0.len(), 4);
		assert_eq!(
			spec.0.get(&BookClubMemberRole::MEMBER),
			Some(&"Member".to_string())
		);
		assert_eq!(
			spec.0.get(&BookClubMemberRole::MODERATOR),
			Some(&"Moderator".to_string())
		);
		assert_eq!(
			spec.0.get(&BookClubMemberRole::ADMIN),
			Some(&"Admin".to_string())
		);
		assert_eq!(
			spec.0.get(&BookClubMemberRole::CREATOR),
			Some(&"Creator".to_string())
		);
	}

	#[test]
	fn deserialize_member_role_spec_from_bytes() {
		let spec_str = r#"{"MEMBER":"Crewmate","MODERATOR":"Boatswain","ADMIN":"First Mate","CREATOR":"Captain"}"#;
		let spec_json = serde_json::from_str::<serde_json::Value>(spec_str).unwrap();
		let spec_bytes = spec_json.to_string().into_bytes();
		let spec = BookClubMemberRoleSpec::from(spec_bytes);
		assert_eq!(spec.0.len(), 4);
		assert_eq!(
			spec.0.get(&BookClubMemberRole::MEMBER),
			Some(&"Crewmate".to_string())
		);
		assert_eq!(
			spec.0.get(&BookClubMemberRole::MODERATOR),
			Some(&"Boatswain".to_string())
		);
		assert_eq!(
			spec.0.get(&BookClubMemberRole::ADMIN),
			Some(&"First Mate".to_string())
		);
		assert_eq!(
			spec.0.get(&BookClubMemberRole::CREATOR),
			Some(&"Captain".to_string())
		);
	}
}
