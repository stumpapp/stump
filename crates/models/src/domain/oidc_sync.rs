use std::collections::HashMap;

use crate::shared::{enums::UserPermission, permission_set::PermissionSet};

pub fn oidc_claims_to_permission_set(
	groups: &[String],
	mapping: &HashMap<String, Vec<UserPermission>>,
) -> PermissionSet {
	let new_permissions: Vec<UserPermission> = groups
		.iter()
		.flat_map(|g| mapping.get(g).into_iter().flatten().copied())
		.collect::<std::collections::HashSet<_>>() // deduplicate
		.into_iter()
		.collect();
	PermissionSet::new(new_permissions)
}

#[cfg(test)]
mod tests {
	use super::*;

	#[test]
	fn test_oidc_claims_to_permission_set_deduplication() {
		let groups = vec![
			"group1".to_string(),
			"group2".to_string(),
			"group1".to_string(), // duplicate
		];

		let mut mapping = HashMap::new();
		mapping.insert("group1".to_string(), vec![UserPermission::ManageServer]);
		mapping.insert("group2".to_string(), vec![UserPermission::ManageUsers]);

		let permissions_set = oidc_claims_to_permission_set(&groups, &mapping);
		let resolved = permissions_set
			.resolve_into_string()
			.expect("Failed to resolve permissions");

		assert!(resolved.contains(UserPermission::ManageServer.to_string().as_str()));
		assert!(resolved.contains(UserPermission::ManageUsers.to_string().as_str()));
	}

	#[test]
	fn test_oidc_claims_to_permission_set_no_mapping() {
		let groups = vec!["group1".to_string(), "group2".to_string()];

		let mapping = HashMap::new(); // empty mapping

		let permissions_set = oidc_claims_to_permission_set(&groups, &mapping);
		let resolved = permissions_set.resolve_into_string();

		assert!(resolved.is_none());
	}
}
