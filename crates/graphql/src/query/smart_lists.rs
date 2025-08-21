use super::smart_lists_builder::{build_filters, build_smart_list_items};
use crate::{
	data::{AuthContext, CoreContext},
	guard::PermissionGuard,
	input::smart_lists::{
		SmartListFilterGroupInput, SmartListFilterInput, SmartListsInput,
	},
	object::{media::Media, smart_list_item::SmartListItems, smart_lists::SmartList},
	query::media::{add_sessions_join_for_filter, should_add_sessions_join_for_filter},
};
use async_graphql::{Context, Object, Result, SimpleObject, ID};
use models::{
	entity::{
		library, media, series,
		smart_list::{self},
		user::AuthUser,
	},
	shared::enums::UserPermission,
};
use sea_orm::{prelude::*, QuerySelect, Select, TransactionTrait};
use std::collections::HashSet;

#[derive(Default, Clone, Copy)]
pub struct SmartListsQuery;

#[derive(Debug, SimpleObject)]
pub struct SmartListMeta {
	matched_books: i64,
	matched_series: i64,
	matched_libraries: i64,
}

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
			build_books_query(user, smart_list.joiner, &deserialized_filters);

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
	async fn smart_list_items(self, ctx: &Context<'_>, id: ID) -> Result<SmartListItems> {
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
			build_books_query(user, smart_list.joiner, &deserialized_filters);

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

fn build_books_query(
	user: &AuthUser,
	joiner: smart_list::SmartListJoiner,
	filters: &[SmartListFilterGroupInput],
) -> Select<media::Entity> {
	let conditions = build_filters(joiner, filters);
	let query =
		add_sessions_join(user, media::ModelWithMetadata::find_for_user(user), filters);
	let query = add_library_join(query, filters);

	query.filter(conditions)
}

fn add_library_join(
	query: Select<media::Entity>,
	filters: &[SmartListFilterGroupInput],
) -> Select<media::Entity> {
	let is_using_library = filters.iter().any(|filter_group| {
		for filter in &filter_group.groups {
			if let SmartListFilterInput::Library(_) = filter {
				return true;
			}
		}

		false
	});

	if is_using_library {
		query.join_rev(
			sea_orm::JoinType::InnerJoin,
			library::Entity::belongs_to(series::Entity)
				.from(models::entity::library::Column::Id)
				.to(models::entity::series::Column::LibraryId)
				.into(),
		)
	} else {
		query
	}
}

fn add_sessions_join(
	user: &AuthUser,
	query: Select<media::Entity>,
	filters: &[SmartListFilterGroupInput],
) -> Select<media::Entity> {
	let filter_using_session = filters.iter().find(|filter_group| {
		for filter in &filter_group.groups {
			if let SmartListFilterInput::Media(media_filter) = filter {
				if should_add_sessions_join_for_filter(media_filter) {
					return true;
				}
			}
		}

		false
	});

	if let Some(filter_group) = filter_using_session {
		for filter in &filter_group.groups {
			if let SmartListFilterInput::Media(media_filter) = filter {
				return add_sessions_join_for_filter(user, media_filter, query);
			}
		}
	}

	query
}

#[cfg(test)]
mod tests {
	use super::*;
	use crate::{
		filter::{
			library::LibraryFilterInput, media::MediaFilterInput, StringLikeFilter,
		},
		input::smart_lists::{SmartListFilterGroupInput, SmartListGroupJoiner},
		tests::common::get_default_user,
	};
	use pretty_assertions::assert_eq;
	use sea_orm::{sea_query::SqliteQueryBuilder, QueryTrait};

	#[test]
	fn test_build_filters_two() {
		let filters: Vec<SmartListFilterGroupInput> = vec![
			SmartListFilterGroupInput {
				joiner: SmartListGroupJoiner::Or,
				groups: vec![SmartListFilterInput::Media(MediaFilterInput {
					name: Some(StringLikeFilter::Eq("Book".to_string())),
					_and: None,
					created_at: None,
					extension: None,
					metadata: None,
					_not: None,
					_or: None,
					pages: None,
					path: None,
					reading_status: None,
					series: None,
					series_id: None,
					size: None,
					status: None,
					updated_at: None,
				})],
			},
			SmartListFilterGroupInput {
				joiner: SmartListGroupJoiner::Or,
				groups: vec![SmartListFilterInput::Library(LibraryFilterInput {
					id: None,
					name: Some(StringLikeFilter::Eq("Test".to_string())),
					path: None,
					_and: None,
					_not: None,
					_or: None,
				})],
			},
		];
		let user = get_default_user();
		let query = build_books_query(&user, smart_list::SmartListJoiner::Or, &filters);

		let sql = query
			.select_only()
			.into_query()
			.to_string(SqliteQueryBuilder);
		assert_eq!(
			sql,
			r#"SELECT  FROM "media" LEFT JOIN "media_metadata" ON "media"."id" = "media_metadata"."media_id" INNER JOIN "series" ON "media"."series_id" = "series"."id" LEFT JOIN "series_metadata" ON "series_metadata"."series_id" = "series"."id" INNER JOIN "libraries" ON "libraries"."id" = "series"."library_id" WHERE "series"."library_id" NOT IN (SELECT "library_id" FROM "library_exclusions" WHERE "library_exclusions"."user_id" = '42') AND ("media"."name" = 'Book' OR "libraries"."name" = 'Test')"#
		);
	}
}
