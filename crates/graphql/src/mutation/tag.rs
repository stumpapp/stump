use crate::{
	data::{AuthContext, CoreContext},
	guard::PermissionGuard,
	object::{media::Media, series::Series, tag::Tag},
};
use async_graphql::{Context, Object, Result, ID};
use models::{
	entity::{media, media_tag, series, series_tag, tag},
	shared::enums::UserPermission,
};
use sea_orm::{
	prelude::*, sea_query::Query, ActiveValue::Set, DatabaseConnection,
	DatabaseTransaction, IntoActiveModel, QuerySelect, TransactionTrait,
};
use std::collections::HashSet;

#[derive(Default)]
pub struct TagMutation;

#[Object]
impl TagMutation {
	/// Returns a list containing the newly created tags, or an error if creation failed.
	///
	/// If any of the tags already exist an error is returned.
	///
	/// * `tags` - A non-empty list of tags to create.
	#[graphql(guard = "PermissionGuard::one(UserPermission::ManageLibrary)")]
	async fn create_tags(
		&self,
		ctx: &Context<'_>,
		tags: Vec<String>,
	) -> Result<Vec<Tag>> {
		let conn = ctx.data::<CoreContext>()?.conn.as_ref();
		create_tags(conn, tags).await
	}

	/// Rename a tag. Returns the updated tag, or an error if the tag was not found or the new
	/// name already exists.
	#[graphql(guard = "PermissionGuard::one(UserPermission::ManageLibrary)")]
	async fn rename_tag(&self, ctx: &Context<'_>, id: i32, name: String) -> Result<Tag> {
		let conn = ctx.data::<CoreContext>()?.conn.as_ref();
		rename_tag(conn, id, name).await
	}

	/// Set the tags for a media item. Creates any tags that don't exist yet, links new ones,
	/// and unlinks removed ones. Returns the updated media item.
	#[graphql(guard = "PermissionGuard::one(UserPermission::EditMetadata)")]
	async fn set_media_tags(
		&self,
		ctx: &Context<'_>,
		id: ID,
		tags: Vec<String>,
	) -> Result<Media> {
		let AuthContext { user, .. } = ctx.data::<AuthContext>()?;
		let conn = ctx.data::<CoreContext>()?.conn.as_ref();

		let model = media::ModelWithMetadata::find_for_user(user)
			.filter(media::Column::Id.eq(id.to_string()))
			.into_model::<media::ModelWithMetadata>()
			.one(conn)
			.await?
			.ok_or("Media not found")?;

		let existing_tags = tag::Entity::find()
			.filter(
				tag::Column::Id.in_subquery(
					Query::select()
						.column(media_tag::Column::TagId)
						.from(media_tag::Entity)
						.and_where(media_tag::Column::MediaId.eq(model.media.id.clone()))
						.to_owned(),
				),
			)
			.all(conn)
			.await?;

		let txn = conn.begin().await?;

		let (to_connect, to_disconnect) = sync_tags(&txn, &tags, &existing_tags).await?;

		if !to_disconnect.is_empty() {
			media_tag::Entity::delete_many()
				.filter(
					media_tag::Column::TagId
						.is_in(to_disconnect)
						.and(media_tag::Column::MediaId.eq(model.media.id.clone())),
				)
				.exec(&txn)
				.await?;
		}

		if !to_connect.is_empty() {
			let media_id = model.media.id.clone();
			media_tag::Entity::insert_many(
				to_connect
					.into_iter()
					.map(|tag_id| media_tag::ActiveModel {
						media_id: Set(media_id.clone()),
						tag_id: Set(tag_id),
						..Default::default()
					})
					.collect::<Vec<_>>(),
			)
			.on_conflict_do_nothing()
			.exec(&txn)
			.await?;
		}

		txn.commit().await?;

		Ok(model.into())
	}

	/// Set the tags for a series. Creates any tags that don't exist yet, links new ones,
	/// and unlinks removed ones. Returns the updated series.
	#[graphql(guard = "PermissionGuard::one(UserPermission::EditMetadata)")]
	async fn set_series_tags(
		&self,
		ctx: &Context<'_>,
		id: ID,
		tags: Vec<String>,
	) -> Result<Series> {
		let AuthContext { user, .. } = ctx.data::<AuthContext>()?;
		let conn = ctx.data::<CoreContext>()?.conn.as_ref();

		let model = series::ModelWithMetadata::find_for_user(user)
			.filter(series::Column::Id.eq(id.to_string()))
			.into_model::<series::ModelWithMetadata>()
			.one(conn)
			.await?
			.ok_or("Series not found")?;

		let existing_tags = tag::Entity::find()
			.filter(
				tag::Column::Id.in_subquery(
					Query::select()
						.column(series_tag::Column::TagId)
						.from(series_tag::Entity)
						.and_where(
							series_tag::Column::SeriesId.eq(model.series.id.clone()),
						)
						.to_owned(),
				),
			)
			.all(conn)
			.await?;

		let txn = conn.begin().await?;

		let (to_connect, to_disconnect) = sync_tags(&txn, &tags, &existing_tags).await?;

		if !to_disconnect.is_empty() {
			series_tag::Entity::delete_many()
				.filter(
					series_tag::Column::TagId
						.is_in(to_disconnect)
						.and(series_tag::Column::SeriesId.eq(model.series.id.clone())),
				)
				.exec(&txn)
				.await?;
		}

		if !to_connect.is_empty() {
			let series_id = model.series.id.clone();
			series_tag::Entity::insert_many(
				to_connect
					.into_iter()
					.map(|tag_id| series_tag::ActiveModel {
						series_id: Set(series_id.clone()),
						tag_id: Set(tag_id),
						..Default::default()
					})
					.collect::<Vec<_>>(),
			)
			.on_conflict_do_nothing()
			.exec(&txn)
			.await?;
		}

		txn.commit().await?;

		Ok(model.into())
	}

	/// Delete tags. Returns a list containing the deleted tags, or an error if deletion failed.
	///
	/// * `tags` - A non-empty list of tags to delete.
	#[graphql(guard = "PermissionGuard::one(UserPermission::ManageLibrary)")]
	async fn delete_tags(
		&self,
		ctx: &Context<'_>,
		tags: Vec<String>,
	) -> Result<Vec<Tag>> {
		if tags.is_empty() {
			return Err("No tags provided".into());
		}

		let conn = ctx.data::<CoreContext>()?.conn.as_ref();

		let deleted_tags = tag::Entity::delete_many()
			.filter(tag::Column::Name.is_in(tags.clone()))
			.exec_with_returning(conn)
			.await?;

		Ok(deleted_tags.into_iter().map(Tag::from).collect())
	}
}

async fn get_unique_tags(
	txn: &DatabaseTransaction,
	tags: Vec<String>,
) -> Result<Vec<String>> {
	if tags.is_empty() {
		return Err("No tags provided".into());
	}

	let unique_tags: Vec<String> = tags
		.into_iter()
		.collect::<HashSet<_>>()
		.into_iter()
		.collect();

	let existing_tags: Vec<String> = tag::Entity::find()
		.select_only()
		.columns(vec![tag::Column::Name])
		.filter(tag::Column::Name.is_in(unique_tags.clone()))
		.into_tuple()
		.all(txn)
		.await?;

	if !existing_tags.is_empty() {
		return Err(format!("Tags already exist: {:?}", existing_tags).into());
	}

	Ok(unique_tags)
}

async fn insert_tags(
	txn: &DatabaseTransaction,
	tags: Vec<String>,
) -> Result<Vec<tag::Model>, DbErr> {
	let new_tag_models = tags
		.iter()
		.map(|t| tag::ActiveModel {
			name: Set(t.clone()),
			..Default::default()
		})
		.collect::<Vec<tag::ActiveModel>>();

	tag::Entity::insert_many(new_tag_models)
		.exec_with_returning_many(txn)
		.await
}

async fn create_tags(conn: &DatabaseConnection, tags: Vec<String>) -> Result<Vec<Tag>> {
	let txn = conn.begin().await?;
	let unique_tags = get_unique_tags(&txn, tags).await?;
	let inserted_tags = insert_tags(&txn, unique_tags).await?;

	txn.commit().await?;

	Ok(inserted_tags.into_iter().map(Tag::from).collect())
}

/// Given desired tag names and the tags currently linked to an entity, resolves which tags
/// need to be created, connected, and disconnected. Returns `(tag_ids_to_connect, tag_ids_to_disconnect)`.
///
/// Tags in `desired` that don't exist in the database are created. Tags currently linked but
/// not in `desired` are marked for disconnection.
pub(crate) async fn sync_tags(
	txn: &DatabaseTransaction,
	desired: &[String],
	existing_linked: &[tag::Model],
) -> Result<(Vec<i32>, Vec<i32>)> {
	// Tags in desired that are NOT currently linked to this entity
	let tags_not_linked = desired
		.iter()
		.filter(|name| !existing_linked.iter().any(|t| t.name == **name))
		.collect::<Vec<_>>();

	// Of those, which already exist in the tags table (but aren't linked to this entity)?
	let tags_existing_but_not_linked = tag::Entity::find()
		.filter(tag::Column::Name.is_in(tags_not_linked.clone()))
		.all(txn)
		.await?;

	// The rest need to be created
	let tags_to_create = tags_not_linked
		.iter()
		.filter(|name| {
			!tags_existing_but_not_linked
				.iter()
				.any(|t| t.name == ***name)
		})
		.map(|name| tag::ActiveModel {
			name: Set(name.to_string()),
			..Default::default()
		})
		.collect::<Vec<_>>();

	let created_tags = if !tags_to_create.is_empty() {
		tag::Entity::insert_many(tags_to_create)
			.exec_with_returning_many(txn)
			.await?
	} else {
		vec![]
	};

	let to_connect = tags_existing_but_not_linked
		.iter()
		.chain(created_tags.iter())
		.map(|tag| tag.id)
		.collect::<Vec<_>>();

	let to_disconnect = existing_linked
		.iter()
		.filter(|tag| !desired.iter().any(|name| name == &tag.name))
		.map(|tag| tag.id)
		.collect::<Vec<_>>();

	Ok((to_connect, to_disconnect))
}

async fn rename_tag(conn: &DatabaseConnection, id: i32, name: String) -> Result<Tag> {
	let name = name.trim().to_string();
	if name.is_empty() {
		return Err("Tag name cannot be empty".into());
	}

	let existing = tag::Entity::find()
		.filter(tag::Column::Name.eq(name.clone()))
		.one(conn)
		.await?;
	if let Some(existing) = existing {
		if existing.id != id {
			return Err(format!("A tag with name '{}' already exists", name).into());
		}
		// Name is unchanged, just return it
		return Ok(Tag::from(existing));
	}

	let model = tag::Entity::find_by_id(id)
		.one(conn)
		.await?
		.ok_or("Tag not found")?;

	let mut active_model = model.into_active_model();
	active_model.name = Set(name);
	let updated = active_model.update(conn).await?;

	Ok(Tag::from(updated))
}

#[cfg(test)]
mod tests {
	use super::*;
	use sea_orm::{MockDatabase, MockExecResult};

	#[tokio::test]
	async fn test_insert() {
		let tag_models = vec![
			tag::Model {
				id: 123,
				name: "hello".to_string(),
			},
			tag::Model {
				id: 321,
				name: "world".to_string(),
			},
		];
		let conn = MockDatabase::new(sea_orm::DatabaseBackend::Sqlite)
			.append_query_results(vec![vec![], tag_models.clone()])
			.append_exec_results(vec![MockExecResult {
				last_insert_id: 1,
				rows_affected: 2,
			}])
			.into_connection();

		let tags = vec!["hello".to_string(), "world".to_string()];
		let mut inserted_tags = create_tags(&conn, tags).await.unwrap();
		inserted_tags.sort();
		assert_eq!(
			inserted_tags,
			vec![
				Tag {
					model: tag_models[0].clone()
				},
				Tag {
					model: tag_models[1].clone()
				}
			]
		);
	}

	#[tokio::test]
	async fn test_find_tags() {
		let mock_db = MockDatabase::new(sea_orm::DatabaseBackend::Sqlite)
			.append_query_results::<tag::Model, Vec<_>, Vec<Vec<_>>>(vec![vec![]])
			.into_connection();
		let txn = mock_db.begin().await.unwrap();

		let tags = vec!["hello".to_string(), "world".to_string()];
		let mut unique_tags = get_unique_tags(&txn, tags).await.unwrap();
		unique_tags.sort();
		assert_eq!(unique_tags, vec!["hello".to_string(), "world".to_string()]);
	}

	#[tokio::test]
	async fn test_find_tags_existing() {
		let tag_models = vec![
			tag::Model {
				id: 123,
				name: "hello".to_string(),
			},
			tag::Model {
				id: 321,
				name: "world".to_string(),
			},
		];

		let mock_db = MockDatabase::new(sea_orm::DatabaseBackend::Sqlite)
			.append_query_results::<tag::Model, Vec<_>, Vec<Vec<_>>>(vec![
				tag_models.clone()
			])
			.into_connection();
		let txn = mock_db.begin().await.unwrap();

		let tags = tag_models
			.iter()
			.map(|t| t.name.clone())
			.collect::<Vec<String>>();
		let unique_tags = get_unique_tags(&txn, tags).await;
		assert!(unique_tags.is_err());
	}

	#[tokio::test]
	async fn test_find_tags_duplicate() {
		let mock_db = MockDatabase::new(sea_orm::DatabaseBackend::Sqlite)
			.append_query_results::<tag::Model, Vec<_>, Vec<Vec<_>>>(vec![vec![]])
			.into_connection();
		let txn = mock_db.begin().await.unwrap();

		let tags = vec!["hello".to_string(), "hello".to_string()];
		let unique_tags = get_unique_tags(&txn, tags).await.unwrap();
		assert_eq!(unique_tags, vec!["hello".to_string()]);
	}

	#[tokio::test]
	async fn test_rename_tag() {
		let original = tag::Model {
			id: 1,
			name: "old_name".to_string(),
		};
		let renamed = tag::Model {
			id: 1,
			name: "new_name".to_string(),
		};

		// Query 1: find by name (no conflict) -> empty
		// Query 2: find by id -> original
		// Query 3: update -> renamed
		let conn = MockDatabase::new(sea_orm::DatabaseBackend::Sqlite)
			.append_query_results::<tag::Model, Vec<_>, Vec<Vec<_>>>(vec![
				vec![],
				vec![original],
				vec![renamed.clone()],
			])
			.append_exec_results(vec![MockExecResult {
				last_insert_id: 1,
				rows_affected: 1,
			}])
			.into_connection();

		let result = rename_tag(&conn, 1, "new_name".to_string()).await.unwrap();
		assert_eq!(result, Tag { model: renamed });
	}

	#[tokio::test]
	async fn test_rename_tag_empty_name() {
		let conn = MockDatabase::new(sea_orm::DatabaseBackend::Sqlite).into_connection();

		let result = rename_tag(&conn, 1, "   ".to_string()).await;
		assert!(result.is_err());
	}

	#[tokio::test]
	async fn test_rename_tag_conflict() {
		let conflicting = tag::Model {
			id: 2,
			name: "taken".to_string(),
		};

		// Query 1: find by name -> found with different id
		let conn = MockDatabase::new(sea_orm::DatabaseBackend::Sqlite)
			.append_query_results::<tag::Model, Vec<_>, Vec<Vec<_>>>(vec![vec![
				conflicting,
			]])
			.into_connection();

		let result = rename_tag(&conn, 1, "taken".to_string()).await;
		assert!(result.is_err());
	}

	#[tokio::test]
	async fn test_rename_tag_unchanged() {
		let existing = tag::Model {
			id: 1,
			name: "same".to_string(),
		};

		// Query 1: find by name -> found with same id (no-op)
		let conn = MockDatabase::new(sea_orm::DatabaseBackend::Sqlite)
			.append_query_results::<tag::Model, Vec<_>, Vec<Vec<_>>>(vec![vec![
				existing.clone()
			]])
			.into_connection();

		let result = rename_tag(&conn, 1, "same".to_string()).await.unwrap();
		assert_eq!(result, Tag { model: existing });
	}

	#[tokio::test]
	async fn test_rename_tag_not_found() {
		// Query 1: find by name -> empty (no conflict)
		// Query 2: find by id -> empty (not found)
		let conn = MockDatabase::new(sea_orm::DatabaseBackend::Sqlite)
			.append_query_results::<tag::Model, Vec<_>, Vec<Vec<_>>>(vec![vec![], vec![]])
			.into_connection();

		let result = rename_tag(&conn, 999, "new_name".to_string()).await;
		assert!(result.is_err());
	}

	#[tokio::test]
	async fn test_sync_tags_all_new() {
		let created = vec![
			tag::Model {
				id: 1,
				name: "a".to_string(),
			},
			tag::Model {
				id: 2,
				name: "b".to_string(),
			},
		];

		// Query 1: find existing tags by name (not linked) -> none exist in DB
		// Query 2: insert_many returns created tags
		let mock_db = MockDatabase::new(sea_orm::DatabaseBackend::Sqlite)
			.append_query_results::<tag::Model, Vec<_>, Vec<Vec<_>>>(vec![
				vec![],
				created.clone(),
			])
			.append_exec_results(vec![MockExecResult {
				last_insert_id: 1,
				rows_affected: 2,
			}])
			.into_connection();
		let txn = mock_db.begin().await.unwrap();

		let desired = vec!["a".to_string(), "b".to_string()];
		let existing_linked: Vec<tag::Model> = vec![];

		let (mut to_connect, to_disconnect) =
			sync_tags(&txn, &desired, &existing_linked).await.unwrap();
		to_connect.sort();
		assert_eq!(to_connect, vec![1, 2]);
		assert!(to_disconnect.is_empty());
	}

	#[tokio::test]
	async fn test_sync_tags_add_and_keep() {
		let existing_linked = vec![tag::Model {
			id: 1,
			name: "keep".to_string(),
		}];
		let existing_in_db = vec![tag::Model {
			id: 2,
			name: "add".to_string(),
		}];

		// Query 1: find tags by name not linked -> "add" exists in DB
		let mock_db = MockDatabase::new(sea_orm::DatabaseBackend::Sqlite)
			.append_query_results::<tag::Model, Vec<_>, Vec<Vec<_>>>(vec![
				existing_in_db.clone()
			])
			.into_connection();
		let txn = mock_db.begin().await.unwrap();

		let desired = vec!["keep".to_string(), "add".to_string()];

		let (to_connect, to_disconnect) =
			sync_tags(&txn, &desired, &existing_linked).await.unwrap();
		assert_eq!(to_connect, vec![2]);
		assert!(to_disconnect.is_empty());
	}

	#[tokio::test]
	async fn test_sync_tags_remove() {
		let existing_linked = vec![
			tag::Model {
				id: 1,
				name: "keep".to_string(),
			},
			tag::Model {
				id: 2,
				name: "remove".to_string(),
			},
		];

		// Query 1: find tags by name not linked -> empty (no new tags to look up)
		let mock_db = MockDatabase::new(sea_orm::DatabaseBackend::Sqlite)
			.append_query_results::<tag::Model, Vec<_>, Vec<Vec<_>>>(vec![vec![]])
			.into_connection();
		let txn = mock_db.begin().await.unwrap();

		let desired = vec!["keep".to_string()];

		let (to_connect, to_disconnect) =
			sync_tags(&txn, &desired, &existing_linked).await.unwrap();
		assert!(to_connect.is_empty());
		assert_eq!(to_disconnect, vec![2]);
	}

	#[tokio::test]
	async fn test_sync_tags_empty_desired() {
		let existing_linked = vec![
			tag::Model {
				id: 1,
				name: "a".to_string(),
			},
			tag::Model {
				id: 2,
				name: "b".to_string(),
			},
		];

		// Query 1: find tags by name not linked -> empty (nothing desired)
		let mock_db = MockDatabase::new(sea_orm::DatabaseBackend::Sqlite)
			.append_query_results::<tag::Model, Vec<_>, Vec<Vec<_>>>(vec![vec![]])
			.into_connection();
		let txn = mock_db.begin().await.unwrap();

		let desired: Vec<String> = vec![];

		let (to_connect, mut to_disconnect) =
			sync_tags(&txn, &desired, &existing_linked).await.unwrap();
		to_disconnect.sort();
		assert!(to_connect.is_empty());
		assert_eq!(to_disconnect, vec![1, 2]);
	}
}
