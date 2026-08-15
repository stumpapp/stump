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
	sync_oidc_groups_and_permissions(tx, user_id, groups, mapping).await?;
	sync_oidc_library_access(tx, user_id, groups).await?;
	Ok(())
}

/// sync the user's groups and group-associated permissions if a group-permission mapping is provided
#[tracing::instrument(skip(tx, groups, mapping), err)]
async fn sync_oidc_groups_and_permissions(
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

// Note: i feel like this is easily conflated with sync_oidc_library_access_for_library, the
// difference here is that this function is for syncing access after a user logs in and we get
// their oidc group, while sync_oidc_library_access_for_library is for syncing access after a library
// has been updated with new oidc groups (applied to all oidc users).

/// sync the user's library access based on their OIDC groups and libraries which are managed by
/// OIDC groups.
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
				.filter(|g| !g.is_empty())
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
/// been updated. users who are not oidc-managed will not be affected by this function
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
				.filter(|g| !g.is_empty())
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

	if oidc_users.is_empty() {
		tracing::debug!("No OIDC-managed users found, skipping library access sync");
		return Ok(());
	}

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

#[cfg(test)]
mod tests {
	use std::collections::HashMap;

	use crate::{
		entity::{library_access, user},
		services::oidc_sync::{
			sync_oidc_groups_and_permissions, sync_oidc_library_access,
			sync_oidc_library_access_for_library,
		},
		shared::{enums::UserPermission, permission_set::PermissionSet},
	};

	use sea_orm::{prelude::*, ActiveValue};
	use tests::{db::test_database, fake_data};

	/// should only sync groups if no mapping for permissions is provided
	#[tokio::test]
	async fn test_sync_oidc_groups_and_permissions_only_groups() {
		let db = test_database().await;

		let user = fake_data::User::new("oromei").insert(&db).await;
		assert!(user.oidc_groups.is_none());

		sync_oidc_groups_and_permissions(
			&db,
			&user.id,
			&["silly".to_string(), "goose".to_string()],
			None,
		)
		.await
		.expect("should have synced oidc groups");

		let updated_user = user::Entity::find_by_id(user.id.clone())
			.one(&db)
			.await
			.expect("should have queried user")
			.expect("user should exist");
		assert_eq!(updated_user.oidc_groups, Some("silly,goose".to_string()));
		assert!(updated_user.permissions.is_none());
	}

	/// should sync both groups and permissions if a mapping is provided
	#[tokio::test]
	async fn test_sync_oidc_groups_and_permissions() {
		let db = test_database().await;

		let user = fake_data::User::new("oromei").insert(&db).await;
		assert!(user.oidc_groups.is_none());

		let group_permission_mapping = [
			(
				"silly".to_string(),
				vec![UserPermission::AccessApiKeys, UserPermission::DownloadFile],
			),
			(
				"goose".to_string(),
				vec![UserPermission::AccessBookClub, UserPermission::ReadUsers],
			),
		]
		.into_iter()
		.collect::<HashMap<String, Vec<UserPermission>>>();

		sync_oidc_groups_and_permissions(
			&db,
			&user.id,
			&["silly".to_string(), "goose".to_string()],
			Some(group_permission_mapping.clone()),
		)
		.await
		.expect("should have synced oidc groups");

		let updated_user = user::Entity::find_by_id(user.id.clone())
			.one(&db)
			.await
			.expect("should have queried user")
			.expect("user should exist");
		assert_eq!(updated_user.oidc_groups, Some("silly,goose".to_string()));

		let permission_set = PermissionSet::from(
			updated_user.permissions.expect("permissions should be set"),
		);
		for permissions in group_permission_mapping.values() {
			assert!(permissions.iter().all(|p| permission_set.contains(*p)));
		}
	}

	/// permissions won't sync if a user doesn't exist lol
	#[tokio::test]
	async fn test_sync_oidc_groups_and_permissions_not_found() {
		let db = test_database().await;

		let err = sync_oidc_groups_and_permissions(
			&db,
			"droids-you-are-looking-for",
			&["silly".to_string(), "goose".to_string()],
			None,
		)
		.await
		.expect_err("should have failed to find user and thus failed to sync");

		assert!(matches!(err, sea_orm::DbErr::Custom(msg) if msg.contains("not found")));
	}

	/// if a user has valid oidc groups and a library is managed by those groups, then the
	/// user should have access to the library after sync, and any users who no longer
	/// have the target oidc groups should have their access revoked
	#[tokio::test]
	async fn test_sync_oidc_library_access() {
		let db = test_database().await;

		let oromei = fake_data::User {
			username: "oromei".to_string(),
			oidc_groups: Some("silly,goose".to_string()),
			..Default::default()
		}
		.insert(&db)
		.await;
		let stinky = fake_data::User {
			username: "stinky".to_string(),
			oidc_groups: Some("smelly,poopy".to_string()),
			..Default::default()
		}
		.insert(&db)
		.await;

		let library = fake_data::Library {
			name: Some("Geese".to_string()),
			oidc_groups: Some("silly,goose".to_string()),
			..Default::default()
		}
		.insert(&db)
		.await;

		let user_access_records = library_access::Entity::find()
			.filter(
				library_access::Column::UserId
					.is_in(vec![oromei.id.clone(), stinky.id.clone()])
					.and(library_access::Column::LibraryId.eq(&library.id)),
			)
			.count(&db)
			.await
			.expect("should have queried library access");
		assert_eq!(user_access_records, 0); // no users should have access yet

		// create a manual access record for stinky, which should be revoked after the sync
		library_access::ActiveModel {
			user_id: ActiveValue::Set(stinky.id.clone()),
			library_id: ActiveValue::Set(library.id.clone()),
			..Default::default()
		}
		.insert(&db)
		.await
		.expect("should have inserted library access for stinky");

		let stinky_access_records = library_access::Entity::find()
			.filter(
				library_access::Column::UserId
					.eq(&stinky.id)
					.and(library_access::Column::LibraryId.eq(&library.id)),
			)
			.count(&db)
			.await
			.expect("should have queried library access");
		assert_eq!(stinky_access_records, 1);

		for user in &mut [oromei.clone(), stinky.clone()] {
			let groups = user
				.oidc_groups
				.take()
				.expect("user should have oidc groups")
				.split(',')
				.map(|g| g.trim().to_string())
				.collect::<Vec<String>>();
			sync_oidc_library_access(&db, &user.id, &groups)
				.await
				.expect("should have synced oidc library access");
		}

		let oromei_access_records = library_access::Entity::find()
			.filter(
				library_access::Column::UserId
					.eq(&oromei.id)
					.and(library_access::Column::LibraryId.eq(&library.id)),
			)
			.count(&db)
			.await
			.expect("should have queried library access");
		assert_eq!(oromei_access_records, 1); // oromei should have access now

		let stinky_access_records = library_access::Entity::find()
			.filter(
				library_access::Column::UserId
					.eq(&stinky.id)
					.and(library_access::Column::LibraryId.eq(&library.id)),
			)
			.count(&db)
			.await
			.expect("should have queried library access");
		assert_eq!(stinky_access_records, 0); // stinky should have had access revoked
	}

	/// if there are no oidc-managed libraries, then no access records should be created for any users
	#[tokio::test]
	async fn test_sync_oidc_library_access_no_oidc_libraries() {
		let db = test_database().await;

		sync_oidc_library_access(
			&db,
			"does-not-matter",
			&["silly".to_string(), "goose".to_string()],
		)
		.await
		.expect("should have synced oidc library access without error");

		let sanity_count = library_access::Entity::find()
			.count(&db)
			.await
			.expect("should have queried library access");
		assert_eq!(sanity_count, 0); // no libraries exist, so no access records should exist
	}

	/// if a library has no valid oidc groups, then no users should be granted access to it after sync
	#[tokio::test]
	async fn test_sync_oidc_library_access_empty_groups_skipped() {
		let db = test_database().await;

		let oromei = fake_data::User {
			username: "oromei".to_string(),
			oidc_groups: Some("silly,goose".to_string()),
			..Default::default()
		}
		.insert(&db)
		.await;

		let library = fake_data::Library {
			name: Some("Geese".to_string()),
			oidc_groups: Some(",".to_string()),
			..Default::default()
		}
		.insert(&db)
		.await;

		sync_oidc_library_access(
			&db,
			&oromei.id,
			&["silly".to_string(), "goose".to_string()],
		)
		.await
		.expect("should have synced oidc library access without error");

		let access_count = library_access::Entity::find()
			.filter(
				library_access::Column::UserId
					.eq(&oromei.id)
					.and(library_access::Column::LibraryId.eq(&library.id)),
			)
			.count(&db)
			.await
			.expect("should have queried library access");
		assert_eq!(access_count, 0); // no valid oidc groups = no access granted
	}

	/// if a user has valid oidc groups and a library is updated with new oidc groups, then the
	/// user should have access to the library after sync, and any users who no longer have
	/// the target oidc groups should have their access revoked
	#[tokio::test]
	async fn test_sync_oidc_library_access_for_library() {
		let db = test_database().await;

		let oromei = fake_data::User {
			username: "oromei".to_string(),
			oidc_groups: Some("silly,goose".to_string()),
			..Default::default()
		}
		.insert(&db)
		.await;

		let stinky = fake_data::User {
			username: "stinky".to_string(),
			oidc_groups: Some("smelly,poopy".to_string()),
			..Default::default()
		}
		.insert(&db)
		.await;

		let library = fake_data::Library {
			name: Some("Geese".to_string()),
			// omit groups because it isn't loaded, caller loaded from
			// library so assume correctness here
			..Default::default()
		}
		.insert(&db)
		.await;

		// create a manual access record for stinky, which should be revoked after the sync
		library_access::ActiveModel {
			user_id: ActiveValue::Set(stinky.id.clone()),
			library_id: ActiveValue::Set(library.id.clone()),
			..Default::default()
		}
		.insert(&db)
		.await
		.expect("should have inserted library access for stinky");

		let access_counts = library_access::Entity::find()
			.filter(
				library_access::Column::UserId
					.is_in(vec![oromei.id.clone(), stinky.id.clone()])
					.and(library_access::Column::LibraryId.eq(&library.id)),
			)
			.count(&db)
			.await
			.expect("should have queried library access");
		assert_eq!(access_counts, 1); // only for stinky

		sync_oidc_library_access_for_library(
			&db,
			&library.id,
			&["silly".to_string(), "goose".to_string()],
		)
		.await
		.expect("should have synced oidc library access for library");

		let oromei_access_records = library_access::Entity::find()
			.filter(
				library_access::Column::UserId
					.eq(&oromei.id)
					.and(library_access::Column::LibraryId.eq(&library.id)),
			)
			.count(&db)
			.await
			.expect("should have queried library access");
		assert_eq!(oromei_access_records, 1); // oromei should have access now

		let stinky_access_records = library_access::Entity::find()
			.filter(
				library_access::Column::UserId
					.eq(&stinky.id)
					.and(library_access::Column::LibraryId.eq(&library.id)),
			)
			.count(&db)
			.await
			.expect("should have queried library access");
		assert_eq!(stinky_access_records, 0); // stinky should have had access revoked
	}

	/// if a user is not oidc-managed, or rather does not have any groups, then any
	/// existing access records for that user should stay put after sync
	#[tokio::test]
	async fn test_sync_oidc_library_access_for_library_skip_revoke_non_oidc_user() {
		let db = test_database().await;

		let oromei = fake_data::User {
			username: "oromei".to_string(),
			oidc_groups: Some("silly,goose".to_string()),
			..Default::default()
		}
		.insert(&db)
		.await;

		let stinky = fake_data::User {
			username: "stinky".to_string(),
			..Default::default()
		}
		.insert(&db)
		.await;

		let library = fake_data::Library {
			name: Some("Geese".to_string()),
			// omit groups because it isn't loaded, caller loaded from
			// library so assume correctness here
			..Default::default()
		}
		.insert(&db)
		.await;

		// should not revoke after sync since non-oidc user
		library_access::ActiveModel {
			user_id: ActiveValue::Set(stinky.id.clone()),
			library_id: ActiveValue::Set(library.id.clone()),
			..Default::default()
		}
		.insert(&db)
		.await
		.expect("should have inserted library access for stinky");

		let access_counts = library_access::Entity::find()
			.filter(
				library_access::Column::UserId
					.is_in(vec![oromei.id.clone(), stinky.id.clone()])
					.and(library_access::Column::LibraryId.eq(&library.id)),
			)
			.count(&db)
			.await
			.expect("should have queried library access");
		assert_eq!(access_counts, 1); // only for stinky

		sync_oidc_library_access_for_library(
			&db,
			&library.id,
			&["silly".to_string(), "goose".to_string()],
		)
		.await
		.expect("should have synced oidc library access for library");

		let oromei_access_records = library_access::Entity::find()
			.filter(
				library_access::Column::UserId
					.eq(&oromei.id)
					.and(library_access::Column::LibraryId.eq(&library.id)),
			)
			.count(&db)
			.await
			.expect("should have queried library access");
		assert_eq!(oromei_access_records, 1); // oromei should have access now

		let stinky_access_records = library_access::Entity::find()
			.filter(
				library_access::Column::UserId
					.eq(&stinky.id)
					.and(library_access::Column::LibraryId.eq(&library.id)),
			)
			.count(&db)
			.await
			.expect("should have queried library access");
		assert_eq!(stinky_access_records, 1); // same as before
	}

	/// if a user has no valid oidc groups then they will not sync access to an
	/// oidc-managed library
	#[tokio::test]
	async fn test_sync_oidc_library_access_for_library_empty_groups_skipped() {
		let db = test_database().await;

		let oromei = fake_data::User {
			username: "oromei".to_string(),
			oidc_groups: Some(",".to_string()),
			..Default::default()
		}
		.insert(&db)
		.await;

		let library = fake_data::Library {
			name: Some("Geese".to_string()),
			// omit groups because it isn't loaded, caller loaded from
			// library so assume correctness here
			..Default::default()
		}
		.insert(&db)
		.await;

		sync_oidc_library_access_for_library(
			&db,
			&library.id,
			&["silly".to_string(), "goose".to_string()],
		)
		.await
		.expect("should have synced oidc library access for library without error");

		let sanity_count = library_access::Entity::find()
			.filter(
				library_access::Column::UserId
					.eq(&oromei.id)
					.and(library_access::Column::LibraryId.eq(&library.id)),
			)
			.count(&db)
			.await
			.expect("should have queried library access");
		assert_eq!(sanity_count, 0); // no valid oidc groups = no access granted
	}
}
