use crate::{
	data::{CoreContext, RequestContext},
	filter::IntoFilter,
	guard::PermissionGuard,
	input::smart_lists::{SmartListFilterInput, SmartListsInput},
	object::{
		media::Media,
		smart_list_item::{
			SmartListGrouped, SmartListGroupedItem, SmartListItemEntity, SmartListItems,
			SmartListUngrouped,
		},
		smart_list_view::SmartListView,
		smart_lists::SmartList,
	},
	query::media::{add_sessions_join_for_filter, should_add_sessions_join_for_filter},
};
use async_graphql::{Context, Object, Result, SimpleObject, ID};
use models::{
	entity::{
		library, media, series,
		smart_list::{self, SmartListGrouping},
		smart_list_view,
		user::AuthUser,
	},
	shared::enums::UserPermission,
};
use sea_orm::{
	prelude::*, Condition, DatabaseTransaction, QuerySelect, Select, TransactionTrait,
};
use std::collections::{HashMap, HashSet};

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
		input: SmartListsInput,
	) -> Result<Vec<SmartList>> {
		let RequestContext { user, .. } = ctx.data::<RequestContext>()?;
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
		let RequestContext { user, .. } = ctx.data::<RequestContext>()?;
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
		let RequestContext { user, .. } = ctx.data::<RequestContext>()?;
		let conn = ctx.data::<CoreContext>()?.conn.as_ref();
		let txn = conn.begin().await?;

		let smart_list = smart_list::Entity::find_by_id(user, id)
			.one(&txn)
			.await?
			.ok_or("Smart list not found".to_string())?;

		let deserialized_filters: Vec<SmartListFilterInput> =
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
			matched_books: matched_books,
			matched_series: matched_series.len() as i64,
			matched_libraries: matched_libraries.len() as i64,
		}))
	}

	#[graphql(guard = "PermissionGuard::one(UserPermission::AccessSmartList)")]
	async fn smart_list_views(self, ctx: &Context<'_>) -> Result<Vec<SmartListView>> {
		let RequestContext { user, .. } = ctx.data::<RequestContext>()?;
		let conn = ctx.data::<CoreContext>()?.conn.as_ref();

		let smart_list_views = smart_list_view::Entity::find_by_user(user)
			.all(conn)
			.await?;

		Ok(smart_list_views
			.into_iter()
			.map(SmartListView::from)
			.collect())
	}

	#[graphql(guard = "PermissionGuard::one(UserPermission::AccessSmartList)")]
	async fn smart_list_items(self, ctx: &Context<'_>, id: ID) -> Result<SmartListItems> {
		let RequestContext { user, .. } = ctx.data::<RequestContext>()?;
		let conn = ctx.data::<CoreContext>()?.conn.as_ref();
		let txn = conn.begin().await?;

		let smart_list = smart_list::Entity::find_by_id(user, id)
			.one(&txn)
			.await?
			.ok_or("Smart list not found".to_string())?;

		let deserialized_filters: Vec<SmartListFilterInput> =
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

async fn build_smart_list_items(
	user: &AuthUser,
	grouping: SmartListGrouping,
	books: Vec<Media>,
	txn: &DatabaseTransaction,
) -> Result<SmartListItems> {
	match grouping {
		SmartListGrouping::ByBooks => {
			Ok(SmartListItems::Ungrouped(SmartListUngrouped { books }))
		},
		SmartListGrouping::BySeries => group_by_series(user, books, txn).await,
		SmartListGrouping::ByLibrary => group_by_library(user, books, txn).await,
	}
}

async fn group_by_series(
	user: &AuthUser,
	books: Vec<Media>,
	txn: &DatabaseTransaction,
) -> Result<SmartListItems> {
	let mut series_ids: HashSet<String> = HashSet::new();
	let mut series_map: HashMap<String, Vec<Media>> = HashMap::new();

	books.into_iter().for_each(|book| {
		if let Some(series_id) = book.model.series_id.clone() {
			series_ids.insert(series_id.clone());
		}

		series_map
			.entry(book.model.series_id.clone().unwrap_or_default())
			.or_default()
			.push(book);
	});

	// get all series for the books
	let series_models = series::ModelWithMetadata::find_for_user(user)
		.filter(series::Column::Id.is_in(series_ids))
		.into_model::<series::ModelWithMetadata>()
		.all(txn)
		.await?;

	let items: Vec<SmartListGroupedItem> = series_models
		.into_iter()
		.map(|series_model| {
			let books = series_map
				.remove(&series_model.series.id)
				.unwrap_or_default();
			SmartListGroupedItem {
				entity: SmartListItemEntity::Series(series_model.into()),
				books,
			}
		})
		.collect();

	Ok(SmartListItems::Grouped(SmartListGrouped { items: items }))
}

async fn group_by_library(
	user: &AuthUser,
	books: Vec<Media>,
	txn: &DatabaseTransaction,
) -> Result<SmartListItems> {
	let mut series_ids: HashSet<String> = HashSet::new();
	let mut series_map: HashMap<String, Vec<Media>> = HashMap::new();

	books.into_iter().for_each(|book| {
		if let Some(series_id) = book.model.series_id.clone() {
			series_ids.insert(series_id.clone());
		}

		series_map
			.entry(book.model.series_id.clone().unwrap_or_default())
			.or_default()
			.push(book);
	});

	// get all series for the books
	let series_and_library_ids: Vec<(String, String)> =
		series::Entity::find_for_user(user)
			.select_only()
			.columns(vec![series::Column::Id, series::Column::LibraryId])
			.filter(series::Column::Id.is_in(series_ids))
			.into_tuple()
			.all(txn)
			.await?;

	let library_to_series_ids: HashMap<String, Vec<String>> = series_and_library_ids
		.into_iter()
		.fold(HashMap::new(), |mut acc, (series_id, library_id)| {
			acc.entry(library_id).or_default().push(series_id);
			acc
		});

	let library_models = library::Entity::find_for_user(user)
		.filter(library::Column::Id.is_in(library_to_series_ids.keys()))
		.into_model::<library::Model>()
		.all(txn)
		.await?;

	let items: Vec<SmartListGroupedItem> = library_models
		.into_iter()
		.map(|library_model| {
			let library_id = library_model.id.clone();
			let series_ids = library_to_series_ids
				.get(&library_id)
				.cloned()
				.unwrap_or_default();

			// collect all the books that belong to the series in this library
			let books: Vec<Media> = series_ids
				.into_iter()
				.flat_map(|series_id| series_map.remove(&series_id).unwrap_or_default())
				.collect();

			SmartListGroupedItem {
				entity: SmartListItemEntity::Library(library_model.into()),
				books,
			}
		})
		.collect();

	Ok(SmartListItems::Grouped(SmartListGrouped { items: items }))
}

fn build_books_query(
	user: &AuthUser,
	joiner: smart_list::SmartListJoiner,
	filters: &[SmartListFilterInput],
) -> Select<media::Entity> {
	let conditions = build_filters(joiner, filters);
	let query =
		add_sessions_join(user, media::ModelWithMetadata::find_for_user(user), filters);

	query.filter(conditions)
}

fn add_sessions_join(
	user: &AuthUser,
	query: Select<media::Entity>,
	filters: &[SmartListFilterInput],
) -> Select<media::Entity> {
	let filter_using_session = filters.iter().find(|filter| {
		if let Some(media_filter) = &filter.media {
			if should_add_sessions_join_for_filter(media_filter) {
				return true;
			}
		}

		false
	});

	if let Some(filter) = filter_using_session {
		if let Some(media_filter) = &filter.media {
			return add_sessions_join_for_filter(user, media_filter, query);
		}
	}

	query
}

fn build_filters(
	joiner: smart_list::SmartListJoiner,
	filters: &[SmartListFilterInput],
) -> Condition {
	let start_condition = if joiner == smart_list::SmartListJoiner::Or {
		Condition::any()
	} else {
		Condition::all()
	};

	// accumulate conditions based on filters
	filters.iter().fold(start_condition, |acc, filter| {
		if let Some(media_filter) = &filter.media {
			acc.add(media_filter.clone().into_filter())
		} else if let Some(media_metadata_filter) = &filter.media_metadata {
			acc.add(media_metadata_filter.clone().into_filter())
		} else if let Some(series_filter) = &filter.series {
			acc.add(series_filter.clone().into_filter())
		} else if let Some(series_metadata_filter) = &filter.series_metadata {
			acc.add(series_metadata_filter.clone().into_filter())
		} else if let Some(library_filter) = &filter.library {
			acc.add(library_filter.clone().into_filter())
		} else {
			acc
		}
	})
}
