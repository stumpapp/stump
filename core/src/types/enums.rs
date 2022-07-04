use rocket_okapi::JsonSchema;
use serde::{Deserialize, Serialize};

pub enum UserRole {
	ServerOwner,
	Member,
}

impl Default for UserRole {
	fn default() -> Self {
		UserRole::Member
	}
}

impl Into<String> for UserRole {
	fn into(self) -> String {
		match self {
			UserRole::ServerOwner => "SERVER_OWNER".to_string(),
			UserRole::Member => "MEMBER".to_string(),
		}
	}
}

#[derive(Debug, Serialize, Deserialize, Clone, JsonSchema, FromFormField)]
pub enum Direction {
	#[serde(rename = "asc")]
	Asc,
	#[serde(rename = "desc")]
	Desc,
}

impl Default for Direction {
	fn default() -> Self {
		Direction::Asc
	}
}

impl Into<prisma_client_rust::Direction> for Direction {
	fn into(self) -> prisma_client_rust::Direction {
		match self {
			Direction::Asc => prisma_client_rust::Direction::Asc,
			Direction::Desc => prisma_client_rust::Direction::Desc,
		}
	}
}
