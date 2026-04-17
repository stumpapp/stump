use async_graphql::InputObject;
use models::{
	entity::{
		finished_reading_session, library, library_config, media, reading_session, series,
	},
	shared::enums::{LibraryType, ReadingStatus},
};
use sea_orm::{
	prelude::*,
	sea_query::{Expr, JoinType, Query, SelectStatement},
	Condition,
};
use serde::{Deserialize, Serialize};
use serde_with::skip_serializing_none;

use super::{
	apply_string_filter, library::LibraryFilterInput,
	series_metadata::SeriesMetadataFilterInput, ConceptualFilter, IntoFilter,
	StringLikeFilter,
};

// TODO: Support filter by tags (requires join logic)

#[skip_serializing_none]
#[derive(InputObject, Clone, Debug, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SeriesFilterInput {
	#[graphql(default)]
	pub name: Option<StringLikeFilter<String>>,
	#[graphql(default)]
	pub path: Option<StringLikeFilter<String>>,
	#[graphql(default)]
	pub library_id: Option<StringLikeFilter<String>>,

	#[graphql(default)]
	pub reading_status: Option<ConceptualFilter<ReadingStatus>>,
	#[graphql(default)]
	pub library_type: Option<ConceptualFilter<LibraryType>>,

	#[graphql(default)]
	pub metadata: Option<SeriesMetadataFilterInput>,
	#[graphql(default)]
	pub library: Option<LibraryFilterInput>,

	#[graphql(name = "_and", default)]
	pub _and: Option<Vec<SeriesFilterInput>>,
	#[graphql(name = "_not", default)]
	pub _not: Option<Vec<SeriesFilterInput>>,
	#[graphql(name = "_or", default)]
	pub _or: Option<Vec<SeriesFilterInput>>,
}

/// Returns a subquery for series ids where at least one book in the series has an active reading session for the user,
/// i.e. the user has _some_ reading activity
fn reading_series_subquery(user_id: &str) -> SelectStatement {
	// select distinct media_id from reading_session where user_id = ?
	let active_media_ids = Query::select()
		.distinct()
		.column(reading_session::Column::MediaId)
		.from(reading_session::Entity)
		.and_where(reading_session::Column::UserId.eq(user_id))
		.to_owned();

	// select distinct series_id from media where series_id is not null and id in (active_media_ids)
	Query::select()
		.distinct()
		.column(media::Column::SeriesId)
		.from(media::Entity)
		.and_where(media::Column::SeriesId.is_not_null())
		.and_where(media::Column::Id.in_subquery(active_media_ids))
		.to_owned()
}

/// Returns a subquery for series ids where all books in the series have at least one
/// finished reading session for the user
fn finished_series_subquery(user_id: &str) -> SelectStatement {
	// select distinct media_id from finished_reading_session where user_id = ?
	let finished_media_ids = Query::select()
		.distinct()
		.column(finished_reading_session::Column::MediaId)
		.from(finished_reading_session::Entity)
		.and_where(finished_reading_session::Column::UserId.eq(user_id))
		.to_owned();

	// select distinct series_id from media where series_id is not null and id not in (finished_media_ids)
	let series_with_unfinished_book = Query::select()
		.distinct()
		.column(media::Column::SeriesId)
		.from(media::Entity)
		.and_where(media::Column::SeriesId.is_not_null())
		.and_where(media::Column::Id.not_in_subquery(finished_media_ids))
		.to_owned();

	// select distinct series_id from media where series_id is not null and series_id not in (series_with_unfinished_book)
	Query::select()
		.distinct()
		.column(media::Column::SeriesId)
		.from(media::Entity)
		.and_where(media::Column::SeriesId.is_not_null())
		.and_where(media::Column::SeriesId.not_in_subquery(series_with_unfinished_book))
		.to_owned()
}

/// Returns a subquery for series ids where all books in the series have no reading sessions for the user,
/// i.e. the user has not started any book in the series
fn not_started_series_subquery(user_id: &str) -> SelectStatement {
	Query::select()
		.distinct()
		.column(media::Column::SeriesId)
		.from(media::Entity)
		.and_where(media::Column::SeriesId.is_not_null())
		.and_where(
			media::Column::SeriesId.not_in_subquery(reading_series_subquery(user_id)),
		)
		.and_where(
			media::Column::SeriesId.not_in_subquery(finished_series_subquery(user_id)),
		)
		.to_owned()
}

fn apply_series_reading_status_filter(
	value: ReadingStatus,
	user_id: &str,
	not: bool,
) -> Condition {
	let subquery = match value {
		ReadingStatus::Reading => reading_series_subquery(user_id),
		ReadingStatus::Finished => finished_series_subquery(user_id),
		ReadingStatus::NotStarted => not_started_series_subquery(user_id),
		// a panic might feel heavy but it will remind me not to surface this until i add some kind of abandoned tracking
		ReadingStatus::Abandoned => unimplemented!("Stump does not yet track abandoned status. This query should not have been possible yet"),
	};

	let expr = Expr::col((series::Entity, series::Column::Id)).in_subquery(subquery);

	if not {
		Condition::all().add(expr.not())
	} else {
		Condition::all().add(expr)
	}
}

// select * from library where id in (select library_id from library_config where library_type = ?)
fn library_type_id_subquery(library_type: LibraryType) -> SelectStatement {
	Query::select()
		.column((library::Entity, library::Column::Id))
		.from(library::Entity)
		.join(
			JoinType::InnerJoin,
			library_config::Entity,
			Expr::col((library_config::Entity, library_config::Column::Id))
				.equals((library::Entity, library::Column::ConfigId)),
		)
		.and_where(
			Expr::col((library_config::Entity, library_config::Column::LibraryType))
				.eq(library_type),
		)
		.to_owned()
}

fn apply_library_type_filter(filter: ConceptualFilter<LibraryType>) -> Condition {
	match filter {
		ConceptualFilter::Is(value) => Condition::all()
			.add(series::Column::LibraryId.in_subquery(library_type_id_subquery(value))),
		ConceptualFilter::IsNot(value) => Condition::all().add(
			series::Column::LibraryId
				.in_subquery(library_type_id_subquery(value))
				.not(),
		),
		ConceptualFilter::IsAnyOf(values) => {
			values.into_iter().fold(Condition::any(), |cond, v| {
				cond.add(
					series::Column::LibraryId.in_subquery(library_type_id_subquery(v)),
				)
			})
		},
		ConceptualFilter::IsNoneOf(values) => values
			.into_iter()
			.fold(Condition::any(), |cond, v| {
				cond.add(
					series::Column::LibraryId.in_subquery(library_type_id_subquery(v)),
				)
			})
			.not(),
	}
}

impl SeriesFilterInput {
	/// The same as `into_filter` but intaking a user_id to resolve user-scoped filters (e.g. `reading_status`)
	pub fn into_filter_with_user(mut self, user_id: &str) -> sea_orm::Condition {
		let reading_status = self.reading_status.take();
		self.into_filter_inner(Some(user_id))
			.add_option(reading_status.map(|f| {
				match f {
					ConceptualFilter::Is(value) => {
						apply_series_reading_status_filter(value, user_id, false)
					},
					ConceptualFilter::IsNot(value) => {
						apply_series_reading_status_filter(value, user_id, true)
					},
					ConceptualFilter::IsAnyOf(values) => {
						values.into_iter().fold(Condition::any(), |cond, v| {
							cond.add(apply_series_reading_status_filter(
								v, user_id, false,
							))
						})
					},
					ConceptualFilter::IsNoneOf(values) => values
						.into_iter()
						.fold(Condition::any(), |cond, v| {
							cond.add(apply_series_reading_status_filter(
								v, user_id, false,
							))
						})
						.not(),
				}
			}))
	}

	fn into_filter_inner(self, user_id: Option<&str>) -> sea_orm::Condition {
		sea_orm::Condition::all()
			.add_option(self._and.map(|f| {
				let mut and_condition = sea_orm::Condition::all();
				for filter in f {
					and_condition = if let Some(uid) = user_id {
						and_condition.add(filter.into_filter_with_user(uid))
					} else {
						and_condition.add(filter.into_filter())
					};
				}
				and_condition
			}))
			.add_option(self._not.map(|f| {
				let mut not_condition = sea_orm::Condition::any();
				for filter in f {
					not_condition = if let Some(uid) = user_id {
						not_condition.add(filter.into_filter_with_user(uid))
					} else {
						not_condition.add(filter.into_filter())
					};
				}
				not_condition.not()
			}))
			.add_option(self._or.map(|f| {
				let mut or_condition = sea_orm::Condition::any();
				for filter in f {
					or_condition = if let Some(uid) = user_id {
						or_condition.add(filter.into_filter_with_user(uid))
					} else {
						or_condition.add(filter.into_filter())
					};
				}
				or_condition
			}))
			.add_option(
				self.name
					.map(|f| apply_string_filter(series::Column::Name, f)),
			)
			.add_option(
				self.path
					.map(|f| apply_string_filter(series::Column::Path, f)),
			)
			.add_option(
				self.library_id
					.map(|f| apply_string_filter(series::Column::LibraryId, f)),
			)
			.add_option(self.library_type.map(apply_library_type_filter))
			.add_option(self.metadata.map(|f| f.into_filter()))
			.add_option(self.library.map(|f| f.into_filter()))
	}
}

impl IntoFilter for SeriesFilterInput {
	fn into_filter(self) -> sea_orm::Condition {
		self.into_filter_inner(None)
	}
}
