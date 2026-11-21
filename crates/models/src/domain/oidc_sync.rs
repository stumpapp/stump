use std::collections::{BTreeSet, HashMap};

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

/// Parses a csv of groups into a set
pub fn parse_oidc_groups(groups: &Option<String>) -> BTreeSet<String> {
	groups
		.as_deref()
		.unwrap_or_default()
		.split(',')
		.map(|group| group.trim().to_string())
		.filter(|group| !group.is_empty())
		.collect()
}

/// Returns the groups to reconcile library access against, or none if the effective sets did not change
pub fn oidc_groups_to_reconcile(
	existing: &Option<String>,
	updated: &Option<String>,
) -> Option<Vec<String>> {
	let updated = parse_oidc_groups(updated);
	if parse_oidc_groups(existing) == updated {
		return None;
	}
	Some(updated.into_iter().collect())
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

	/// if no change then no reconcil needed
	#[test]
	fn test_unchanged_oidc_groups_do_not_trigger_reconciliation() {
		assert_eq!(
			oidc_groups_to_reconcile(
				&Some("readers, admins".to_string()),
				&Some("readers, admins".to_string())
			),
			None,
		);
	}

	// love a good long name
	/// if the string csv values are different but resolve to the same effective set of groups then
	/// no reconcile is needed
	#[test]
	fn test_reordered_or_otherwise_effectively_equivalent_oidc_groups_do_not_trigger_reconciliation()
	 {
		assert_eq!(
			oidc_groups_to_reconcile(
				&Some("readers, admins".to_string()),
				&Some("admins,readers,readers,".to_string())
			),
			None,
		);
		assert_eq!(oidc_groups_to_reconcile(&Some("".to_string()), &None), None);
	}

	/// if changed then yeah reconcile
	#[test]
	fn test_changed_oidc_groups_trigger_reconciliation() {
		assert_eq!(
			oidc_groups_to_reconcile(
				&Some("readers".to_string()),
				&Some("readers,admins".to_string())
			),
			Some(vec!["admins".to_string(), "readers".to_string()]),
		);
	}

	/// if changed to be empty then yeah reconcile, more of a sanity check
	#[test]
	fn test_clearing_oidc_groups_triggers_empty_group_reconciliation() {
		assert_eq!(
			oidc_groups_to_reconcile(&Some("readers".to_string()), &None),
			Some(vec![]),
		);
	}
}
