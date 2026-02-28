use super::smart_lists_builder::{build_books_query, build_smart_list_items};
use crate::{
	data::{AuthContext, CoreContext},
	guard::PermissionGuard,
	input::smart_lists::{SmartListFilterGroupInput, SmartListsInput},
	object::{
		media::Media,
		smart_list_item::SmartListItems,
		smart_lists::{SmartList, SmartListMeta},
	},
};
use async_graphql::{Context, Object, Result, ID};
use models::{
	entity::{
		media, series,
		smart_list::{self},
	},
	shared::enums::UserPermission,
};
use sea_orm::{QuerySelect, TransactionTrait};
use std::collections::HashSet;

#[derive(Default, Clone, Copy)]
pub struct SmartListsQuery;

#[Object]
impl SmartListsQuery {
	#[graphql(guard = "PermissionGuard::one(UserPermission::AccessSmartList)")]
	async fn smart_lists(
		self,
		ctx: &Context<'_>,
		#[graphql(default)] input: SmartListsInput,
	) -> Result<Vec<SmartList>> {
		let AuthContext { user, .. } = ctx.data::<AuthContext>()?;
		let conn = ctx.data::<CoreContext>()?.conn.as_ref();

		let query_all = input.all.unwrap_or(false);
		if query_all && !user.is_server_owner {
			return Err(
				"Cannot query all smart lists unless you are a server owner".into()
			);
		}

		let mine = input.mine.unwrap_or(false);
		if query_all && mine {
			return Err("Cannot query all and mine at the same time".into());
		}

		let smart_lists = smart_list::Entity::find_for_user(
			user,
			input.all.unwrap_or(false),
			input.mine.unwrap_or(false),
			input.search,
		)
		.all(conn)
		.await?;

		Ok(smart_lists.into_iter().map(SmartList::from).collect())
	}

	#[graphql(guard = "PermissionGuard::one(UserPermission::AccessSmartList)")]
	async fn smart_list_by_id(
		self,
		ctx: &Context<'_>,
		id: ID,
	) -> Result<Option<SmartList>> {
		let AuthContext { user, .. } = ctx.data::<AuthContext>()?;
		let conn = ctx.data::<CoreContext>()?.conn.as_ref();

		let smart_list = smart_list::Entity::find_by_id(user, id).one(conn).await?;

		Ok(smart_list.map(SmartList::from))
	}

	#[graphql(guard = "PermissionGuard::one(UserPermission::AccessSmartList)")]
	async fn smart_list_meta(
		self,
		ctx: &Context<'_>,
		id: ID,
	) -> Result<Option<SmartListMeta>> {
		let AuthContext { user, .. } = ctx.data::<AuthContext>()?;
		let conn = ctx.data::<CoreContext>()?.conn.as_ref();
		let txn = conn.begin().await?;

		let smart_list = smart_list::Entity::find_by_id(user, id)
			.one(&txn)
			.await?
			.ok_or("Smart list not found".to_string())?;

		let deserialized_filters: Vec<SmartListFilterGroupInput> =
			serde_json::from_slice(&smart_list.filters)?;

		let books_query =
			build_books_query(user, smart_list.joiner, &deserialized_filters, None);

		let ids: Vec<(String, Option<String>)> = books_query
			.select_only()
			.column(media::Column::SeriesId)
			.column(series::Column::LibraryId)
			.into_tuple()
			.all(&txn)
			.await?;

		let matched_books = ids.len() as i64;
		let mut matched_series: HashSet<String> = HashSet::new();
		let mut matched_libraries: HashSet<String> = HashSet::new();

		for (series_id, library_id) in ids {
			matched_series.insert(series_id);
			if let Some(library_id) = library_id {
				matched_libraries.insert(library_id);
			}
		}

		txn.commit().await?;

		Ok(Some(SmartListMeta {
			matched_books,
			matched_series: matched_series.len() as i64,
			matched_libraries: matched_libraries.len() as i64,
		}))
	}

	#[graphql(guard = "PermissionGuard::one(UserPermission::AccessSmartList)")]
	async fn smart_list_items(
		self,
		ctx: &Context<'_>,
		id: ID,
		#[graphql(default)] limit: Option<u64>,
	) -> Result<SmartListItems> {
		let AuthContext { user, .. } = ctx.data::<AuthContext>()?;
		let conn = ctx.data::<CoreContext>()?.conn.as_ref();
		let txn = conn.begin().await?;

		let smart_list = smart_list::Entity::find_by_id(user, id)
			.one(&txn)
			.await?
			.ok_or("Smart list not found".to_string())?;

		let deserialized_filters: Vec<SmartListFilterGroupInput> =
			serde_json::from_slice(&smart_list.filters)?;

		let books_query =
			build_books_query(user, smart_list.joiner, &deserialized_filters, limit);

		let models = books_query
			.into_model::<media::ModelWithMetadata>()
			.all(&txn)
			.await?;

		let books: Vec<Media> = models.into_iter().map(Media::from).collect();
		let items =
			build_smart_list_items(user, smart_list.default_grouping, books, &txn)
				.await?;

		txn.commit().await?;

		Ok(items)
	}
}
