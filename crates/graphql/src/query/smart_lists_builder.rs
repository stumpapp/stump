use crate::{
	filter::IntoFilter,
	input::smart_lists::{
		SmartListFilterGroupInput, SmartListFilterInput, SmartListGroupJoiner,
	},
	object::{
		media::Media,
		smart_list_item::{
			SmartListGrouped, SmartListGroupedItem, SmartListItemEntity, SmartListItems,
			SmartListUngrouped,
		},
	},
};
use async_graphql::Result;
use models::entity::{
	library, series,
	smart_list::{self, SmartListGrouping},
	user::AuthUser,
};
use sea_orm::{prelude::*, Condition, DatabaseTransaction, QuerySelect};

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

#[cfg(test)]
mod tests {
	use super::*;
	use crate::filter::{
		library::LibraryFilterInput, media::MediaFilterInput, StringLikeFilter,
	};
	use pretty_assertions::assert_eq;
	use sea_orm::sea_query::{Query, SqliteQueryBuilder};

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
}
