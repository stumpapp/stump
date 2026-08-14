use std::collections::{HashMap, HashSet};

use sea_orm::{prelude::*, ActiveValue, ConnectionTrait, IntoActiveModel, QuerySelect};

use crate::{
	domain::oidc_sync::oidc_claims_to_permission_set,
	entity::{library, library_access, user},
	shared::enums::UserPermission,
};

/// sync everything there is to sync wrt permissions, access, etc. for a user based on their
/// OIDC groups and the mapping of groups to permissions
pub async fn sync_oidc_user(
	tx: &impl ConnectionTrait,
	user_id: &str,
	groups: &[String],
	mapping: Option<HashMap<String, Vec<UserPermission>>>,
) -> Result<(), sea_orm::DbErr> {
	sync_oidc_permissions(tx, user_id, groups, mapping).await?;
	sync_oidc_library_access(tx, user_id, groups).await?;
	Ok(())
}

/// sync the user's permissions based on their OIDC groups and the mapping of groups to permissions,
/// and update the user's stored OIDC groups for future reference
#[tracing::instrument(skip(tx, groups, mapping), err)]
pub async fn sync_oidc_permissions(
	tx: &impl ConnectionTrait,
	user_id: &str,
	groups: &[String],
	mapping: Option<HashMap<String, Vec<UserPermission>>>,
) -> Result<(), sea_orm::DbErr> {
	let Some(user) = user::Entity::find_by_id(user_id.to_string())
		.one(tx)
		.await?
	else {
		return Err(sea_orm::DbErr::Custom(format!(
			"User with ID {} not found",
			user_id
		)));
	};

	let mut active_model = user.into_active_model();
	if let Some(mapping) = mapping {
		let resolved_permissions =
			oidc_claims_to_permission_set(groups, &mapping).resolve_into_string();
		active_model.permissions = ActiveValue::Set(resolved_permissions);
	}

	active_model.oidc_groups = ActiveValue::Set(Some(groups.join(",")));
	active_model.update(tx).await?;

	tracing::debug!("Synced OIDC permissions for user");

	Ok(())
}

/// sync the user's library access based on their OIDC groups and libraries which are managed by
/// OIDC groups
#[tracing::instrument(skip(tx, groups), err)]
pub async fn sync_oidc_library_access(
	tx: &impl ConnectionTrait,
	user_id: &str,
	groups: &[String],
) -> Result<(), DbErr> {
	let oidc_libraries: Vec<(String, Vec<String>)> = library::Entity::find()
		.select_only()
		.columns([library::Column::Id, library::Column::OidcGroups])
		.filter(library::Column::OidcGroups.is_not_null())
		.into_tuple::<(String, String)>()
		.all(tx)
		.await?
		.into_iter()
		// groups is a string, should be split by comma and trimmed
		.filter_map(|(id, oidc_groups): (String, String)| {
			let library_groups: Vec<String> = oidc_groups
				.split(',')
				.map(|g| g.trim().to_string())
				.collect();
			if library_groups.is_empty() {
				tracing::warn!(
					library_id = id.as_str(),
					"Library has OIDC groups but none are valid, skipping"
				);
				return None;
			}
			Some((id, library_groups))
		})
		.collect();

	if oidc_libraries.is_empty() {
		tracing::debug!("No OIDC-managed libraries found, skipping library access sync");
		return Ok(());
	}

	let oidc_library_ids: Vec<String> =
		oidc_libraries.iter().map(|(id, _)| id.clone()).collect();

	let should_have: HashSet<String> = oidc_libraries
		.iter()
		.filter(|(_, library_groups)| library_groups.iter().any(|g| groups.contains(g)))
		.map(|(id, _)| id.clone())
		.collect();

	let currently_has: HashSet<String> = library_access::Entity::find()
		.select_only()
		.column(library_access::Column::LibraryId)
		.filter(
			library_access::Column::UserId
				.eq(user_id)
				.and(library_access::Column::LibraryId.is_in(oidc_library_ids.clone())),
		)
		.into_tuple::<String>()
		.all(tx)
		.await?
		.into_iter()
		.collect();

	let to_grant: Vec<_> = should_have.difference(&currently_has).collect();
	let to_grant_num = to_grant.len();
	let to_revoke: Vec<String> =
		currently_has.difference(&should_have).cloned().collect();
	let to_revoke_num = to_revoke.len();

	if to_grant.is_empty() && to_revoke.is_empty() {
		tracing::debug!("No changes to OIDC library access for user");
		return Ok(());
	}

	for library_id in to_grant {
		library_access::ActiveModel {
			user_id: ActiveValue::Set(user_id.to_string()),
			library_id: ActiveValue::Set(library_id.clone()),
			..Default::default()
		}
		.insert(tx)
		.await?;
	}

	if !to_revoke.is_empty() {
		library_access::Entity::delete_many()
			.filter(library_access::Column::UserId.eq(user_id))
			.filter(library_access::Column::LibraryId.is_in(to_revoke))
			.exec(tx)
			.await?;
	}

	tracing::debug!(
		added = to_grant_num,
		removed = to_revoke_num,
		"Synced OIDC library access for user"
	);

	Ok(())
}

/// sync changes to library access for a specific library after its OIDC groups have
/// been updated
pub async fn sync_oidc_library_access_for_library(
	tx: &impl ConnectionTrait,
	library_id: &str,
	new_oidc_groups: &[String],
) -> Result<(), sea_orm::DbErr> {
	let oidc_users: Vec<(String, Vec<String>)> = user::Entity::find()
		.select_only()
		.columns([user::Column::Id, user::Column::OidcGroups])
		.filter(user::Column::OidcGroups.is_not_null())
		.into_tuple::<(String, String)>()
		.all(tx)
		.await?
		.into_iter()
		// groups is a string, should be split by comma and trimmed
		.filter_map(|(id, oidc_groups): (String, String)| {
			let user_groups: Vec<String> = oidc_groups
				.split(',')
				.map(|g| g.trim().to_string())
				.collect();
			if user_groups.is_empty() {
				tracing::warn!(
					user_id = id.as_str(),
					"User has OIDC groups but none are valid, skipping"
				);
				return None;
			}
			Some((id, user_groups))
		})
		.collect();

	for (user_id, user_groups) in oidc_users {
		let should_have = new_oidc_groups.iter().any(|g| user_groups.contains(g));

		let currently_has = library_access::Entity::find()
			.filter(library_access::Column::UserId.eq(&user_id))
			.filter(library_access::Column::LibraryId.eq(library_id))
			.count(tx)
			.await? > 0;

		if should_have && !currently_has {
			library_access::ActiveModel {
				user_id: ActiveValue::Set(user_id.clone()),
				library_id: ActiveValue::Set(library_id.to_string()),
				..Default::default()
			}
			.insert(tx)
			.await?;
		} else if !should_have && currently_has {
			library_access::Entity::delete_many()
				.filter(library_access::Column::UserId.eq(&user_id))
				.filter(library_access::Column::LibraryId.eq(library_id))
				.exec(tx)
				.await?;
		}
	}

	Ok(())
}

// TODO(oidc): tests plz
