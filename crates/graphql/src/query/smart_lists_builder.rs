use crate::{
	filter::IntoFilter,
	input::grouping::{GroupingLevel, GroupingPathInput},
	input::smart_lists::{
		SmartListFilterGroupInput, SmartListFilterInput, SmartListGroupJoiner,
	},
	object::{
		media::Media,
		series::Series,
		smart_list_item::{
			GenericGroupingValue, SmartListGrouped, SmartListGroupedItem,
			SmartListItemEntity, SmartListItems, SmartListUngrouped,
		},
	},
	query::media::{add_sessions_join_for_filter, should_add_sessions_join_for_filter},
};
use async_graphql::Result;
use models::entity::{
	library, media, media_metadata, series,
	smart_list::{self, SmartListGrouping},
	user::AuthUser,
};
use sea_orm::{
	prelude::*, Condition, DatabaseTransaction, QuerySelect, QueryTrait, Select,
};

use std::collections::{HashMap, HashSet};

pub async fn build_smart_list_items(
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

pub async fn apply_multi_level_grouping(
	user: &AuthUser,
	grouping_path: GroupingPathInput,
	books: Vec<Media>,
	txn: &DatabaseTransaction,
) -> Result<SmartListItems> {
	if grouping_path.levels.is_empty() {
		return Ok(SmartListItems::Ungrouped(SmartListUngrouped { books }));
	}

	let grouped_items =
		apply_grouping_iteratively(user, books, &grouping_path.levels, txn).await?;

	Ok(SmartListItems::Grouped(SmartListGrouped {
		items: grouped_items,
	}))
}

async fn apply_grouping_iteratively(
	user: &AuthUser,
	books: Vec<Media>,
	levels: &[GroupingLevel],
	txn: &DatabaseTransaction,
) -> Result<Vec<SmartListGroupedItem>> {
	if levels.is_empty() {
		return Ok(vec![]);
	}

	if levels.len() == 1 {
		let level = &levels[0];
		return group_single_level(user, books, level, txn).await;
	}

	let mut current_items: Vec<SmartListGroupedItem> = Vec::new();

	let first_level = &levels[0];
	let level_0_groups =
		group_single_level(user, books.clone(), first_level, txn).await?;

	for group in level_0_groups {
		if group.books.is_empty() {
			continue;
		}
		let item_books = group.books.clone();
		let item_entity = group.entity.clone();

		current_items.push(SmartListGroupedItem {
			entity: item_entity,
			books: item_books,
			subgroups: Some(vec![group]),
		});
	}

	for level_idx in 1..levels.len() {
		let is_last_level = level_idx == levels.len() - 1;
		let level = &levels[level_idx];

		let mut next_items: Vec<SmartListGroupedItem> = Vec::new();

		// For each current item (which represents a parent group),
		// group its books by the current level's field
		for parent_item in current_items.iter() {
			let subgroups = match &parent_item.subgroups {
				Some(s) => s,
				None => continue,
			};

			let books_to_group: Vec<Media> =
				subgroups.iter().flat_map(|sg| sg.books.clone()).collect();

			if books_to_group.is_empty() {
				continue;
			}

			let child_groups =
				group_single_level(user, books_to_group, level, txn).await?;

			// For each child group, create a new item with:
			// - entity: the child group's entity (current level's grouping)
			// - books: only at the last level
			// - subgroups: the child groups

			let updated_subgroups: Vec<SmartListGroupedItem> = child_groups
				.into_iter()
				.map(|child| {
					let entity = child.entity.clone();
					let books = child.books.clone();
					let subgroups = if is_last_level {
						None
					} else {
						Some(vec![child])
					};
					SmartListGroupedItem {
						entity,
						books,
						subgroups,
					}
				})
				.collect();

			if updated_subgroups.is_empty() {
				continue;
			}

			next_items.push(SmartListGroupedItem {
				entity: parent_item.entity.clone(),
				books: if is_last_level {
					updated_subgroups
						.iter()
						.flat_map(|sg| sg.books.clone())
						.collect()
				} else {
					vec![]
				},
				subgroups: Some(updated_subgroups),
			});
		}

		current_items = next_items;
	}

	Ok(current_items)
}

async fn group_single_level(
	user: &AuthUser,
	books: Vec<Media>,
	level: &GroupingLevel,
	txn: &DatabaseTransaction,
) -> Result<Vec<SmartListGroupedItem>> {
	match level {
		GroupingLevel::Media(media_group_by) => {
			let column = media_group_by.field.to_column();
			match column {
				media::Column::SeriesId => {
					group_by_series_as_items(user, books, txn).await
				},
				_ => Ok(group_books_by_field_as_items(books, media_group_by.field)),
			}
		},
		GroupingLevel::MediaMetadata(media_meta_group_by) => Ok(
			group_books_by_metadata_field_as_items(books, media_meta_group_by.field),
		),
	}
}

async fn group_by_series_as_items(
	user: &AuthUser,
	books: Vec<Media>,
	txn: &DatabaseTransaction,
) -> Result<Vec<SmartListGroupedItem>> {
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
				entity: SmartListItemEntity::Series(Box::new(Series::from(series_model))),
				books,
				subgroups: None,
			}
		})
		.collect();

	Ok(items)
}

fn group_books_by_field_as_items(
	books: Vec<Media>,
	field: media::MediaModelGroupingField,
) -> Vec<SmartListGroupedItem> {
	let mut groups: HashMap<String, Vec<Media>> = HashMap::new();

	for book in books {
		let key = field.get_value(&book.model);
		groups.entry(key).or_default().push(book);
	}

	groups
		.into_iter()
		.map(|(key, books)| SmartListGroupedItem {
			entity: SmartListItemEntity::Generic(GenericGroupingValue { key }),
			books,
			subgroups: None,
		})
		.collect()
}

fn group_books_by_metadata_field_as_items(
	books: Vec<Media>,
	field: media_metadata::MediaMetadataModelGroupingField,
) -> Vec<SmartListGroupedItem> {
	let mut groups: HashMap<String, Vec<Media>> = HashMap::new();

	for book in books {
		let key = if let Some(metadata) = &book.metadata {
			let k = field.get_value(&metadata.model);
			k
		} else {
			String::new()
		};
		groups.entry(key).or_default().push(book);
	}

	groups
		.into_iter()
		.map(|(key, books)| SmartListGroupedItem {
			entity: SmartListItemEntity::Generic(GenericGroupingValue { key }),
			books,
			subgroups: None,
		})
		.collect()
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
				entity: SmartListItemEntity::Series(Box::new(series_model.into())),
				books,
				subgroups: None,
			}
		})
		.collect();

	Ok(SmartListItems::Grouped(SmartListGrouped { items }))
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
				entity: SmartListItemEntity::Library(Box::new(library_model.into())),
				books,
				subgroups: None,
			}
		})
		.collect();

	Ok(SmartListItems::Grouped(SmartListGrouped { items }))
}

pub fn build_filters(
	joiner: smart_list::SmartListJoiner,
	filters: &[SmartListFilterGroupInput],
) -> Condition {
	let start_condition = if joiner == smart_list::SmartListJoiner::Or {
		Condition::any()
	} else {
		Condition::all()
	};

	// accumulate conditions based on filters
	filters.iter().fold(start_condition, |acc, filter_group| {
		let mut condition = match filter_group.joiner {
			SmartListGroupJoiner::And => Condition::all(),
			SmartListGroupJoiner::Or => Condition::any(),
			SmartListGroupJoiner::Not => Condition::all().not(),
		};
		for filter in &filter_group.groups {
			condition = match filter {
				SmartListFilterInput::Media(media_filter) => {
					condition.add(media_filter.clone().into_filter())
				},
				SmartListFilterInput::MediaMetadata(media_metadata_filter) => {
					condition.add(media_metadata_filter.clone().into_filter())
				},
				SmartListFilterInput::Series(series_filter) => {
					condition.add(series_filter.clone().into_filter())
				},
				SmartListFilterInput::SeriesMetadata(series_metadata_filter) => {
					condition.add(series_metadata_filter.clone().into_filter())
				},
				SmartListFilterInput::Library(library_filter) => {
					condition.add(library_filter.clone().into_filter())
				},
			};
		}

		acc.add(condition)
	})
}

pub fn build_books_query(
	user: &AuthUser,
	joiner: smart_list::SmartListJoiner,
	filters: &[SmartListFilterGroupInput],
	limit: Option<u64>,
) -> Select<media::Entity> {
	let conditions = build_filters(joiner, filters);
	let query =
		add_sessions_join(user, media::ModelWithMetadata::find_for_user(user), filters)
			.apply_if(limit, |query, limit| query.limit(limit));
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
		tests::common::get_default_user,
	};
	use pretty_assertions::assert_eq;
	use sea_orm::{
		sea_query::{Query, SqliteQueryBuilder},
		QueryTrait,
	};

	pub fn condition_to_string(condition: &Condition) -> String {
		Query::select()
			.cond_where(condition.clone())
			.to_string(SqliteQueryBuilder)
	}

	#[test]
	fn test_build_filters_empty() {
		let filters: Vec<SmartListFilterGroupInput> = vec![];
		let condition = build_filters(smart_list::SmartListJoiner::And, &filters);
		let sql = condition_to_string(&condition);
		assert_eq!(sql, "SELECT  WHERE TRUE");
	}

	#[test]
	fn test_build_filters_simple() {
		let filters: Vec<SmartListFilterGroupInput> = vec![SmartListFilterGroupInput {
			joiner: SmartListGroupJoiner::And,
			groups: vec![SmartListFilterInput::Media(MediaFilterInput {
				id: None,
				name: Some(StringLikeFilter::Eq("Test".to_string())),
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
		}];
		let condition = build_filters(smart_list::SmartListJoiner::And, &filters);
		let sql = condition_to_string(&condition);
		assert_eq!(sql, r#"SELECT  WHERE "media"."name" = 'Test'"#);
	}

	#[test]
	fn test_build_filters_two() {
		let filters: Vec<SmartListFilterGroupInput> = vec![
			SmartListFilterGroupInput {
				joiner: SmartListGroupJoiner::Not,
				groups: vec![SmartListFilterInput::Media(MediaFilterInput {
					id: None,
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
		let condition = build_filters(smart_list::SmartListJoiner::Or, &filters);
		let sql = condition_to_string(&condition);
		assert_eq!(
			sql,
			r#"SELECT  WHERE (NOT "media"."name" = 'Book') OR "libraries"."name" = 'Test'"#
		);
	}

	#[test]
	fn test_build_books_query() {
		let filters: Vec<SmartListFilterGroupInput> = vec![
			SmartListFilterGroupInput {
				joiner: SmartListGroupJoiner::Or,
				groups: vec![SmartListFilterInput::Media(MediaFilterInput {
					id: None,
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
		let query =
			build_books_query(&user, smart_list::SmartListJoiner::Or, &filters, None);

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
