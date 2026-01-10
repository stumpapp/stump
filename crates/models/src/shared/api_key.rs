use async_graphql::{Enum, OneofObject};
use sea_orm::FromJsonQueryResult;
use serde::{Deserialize, Serialize};

use super::enums::UserPermission;

pub const API_KEY_PREFIX: &str = "stump";

// Note: This is a hack to get untagged unit enums to work with serde. See https://github.com/serde-rs/serde/issues/1560
#[derive(Debug, Copy, Clone, Serialize, PartialEq, Eq, Deserialize, Enum)]
pub enum InheritPermissionValue {
	#[serde(rename = "inherit")]
	Inherit,
}

#[derive(
	Debug, Clone, Serialize, Deserialize, PartialEq, Eq, FromJsonQueryResult, OneofObject,
)]
#[serde(untagged)]
pub enum APIKeyPermissions {
	Inherit(InheritPermissionValue),
	Custom(Vec<UserPermission>),
}

impl APIKeyPermissions {
	pub fn inherit() -> Self {
		APIKeyPermissions::Inherit(InheritPermissionValue::Inherit)
	}
}

impl Default for APIKeyPermissions {
	fn default() -> Self {
		APIKeyPermissions::Inherit(InheritPermissionValue::Inherit)
	}
}

#[cfg(test)]
mod tests {
	use super::*;

	#[test]
	fn test_deserialize_api_key_permissions() {
		let inherit = r#""inherit""#;
		let custom = r#"["ACCESS_A_P_I_KEYS"]"#;

		let inherit: APIKeyPermissions =
			serde_json::from_str(inherit).expect("Failed to deserialize inherit");
		let custom: APIKeyPermissions =
			serde_json::from_str(custom).expect("Failed to deserialize custom");

		assert!(matches!(inherit, APIKeyPermissions::Inherit(_)));
		assert!(matches!(custom, APIKeyPermissions::Custom(_)));
	}

	#[test]
	fn test_serialize_api_key_permissions() {
		let inherit = APIKeyPermissions::Inherit(InheritPermissionValue::Inherit);
		let custom = APIKeyPermissions::Custom(vec![UserPermission::AccessAPIKeys]);

		let inherit =
			serde_json::to_string(&inherit).expect("Failed to serialize inherit");
		let custom = serde_json::to_string(&custom).expect("Failed to serialize custom");

		assert_eq!(inherit, r#""inherit""#);
		assert_eq!(custom, r#"["ACCESS_A_P_I_KEYS"]"#);
	}
}
