use std::{collections::HashMap, str::FromStr};

use serde::{Deserialize, Serialize};
use specta::Type;
use utoipa::ToSchema;

use crate::{
	db::{
		entity::{Library, Media, Series, User},
		filter::{FilterGroup, FilterJoin, MediaSmartFilter, SmartFilter},
	},
	prisma::{library, media, read_progress, series, smart_list, PrismaClient},
	CoreError, CoreResult,
};

use super::{
	prisma_macros::media_grouped_by_library, SmartListItemGroup, SmartListItemGrouping,
	SmartListItems,
};

#[derive(Debug, Clone, Serialize, Deserialize, Type, ToSchema)]
pub struct SmartList {
	pub id: String,
	pub name: String,
	pub description: Option<String>,
	pub filters: SmartFilter<MediaSmartFilter>,
	#[serde(default)]
	pub joiner: FilterJoin,
	#[serde(default)]
	pub default_grouping: SmartListItemGrouping,
}

impl SmartList {
	pub fn into_params(self) -> Vec<media::WhereParam> {
		let where_params = self
			.filters
			.groups
			.into_iter()
			.map(|filter_group| match filter_group {
				FilterGroup::Or { or } => prisma_client_rust::operator::or(
					or.into_iter().map(|f| f.into_params()).collect(),
				),
				FilterGroup::And { and } => prisma_client_rust::operator::and(
					and.into_iter().map(|f| f.into_params()).collect(),
				),
				FilterGroup::Not { not } => prisma_client_rust::operator::not(
					not.into_iter().map(|f| f.into_params()).collect(),
				),
			})
			.collect();

		match self.joiner {
			FilterJoin::And => where_params,
			FilterJoin::Or => vec![prisma_client_rust::operator::or(where_params)],
		}
	}

	/// MUST be called from within a transaction!
	pub async fn build(
		self,
		client: &PrismaClient,
		for_user: &User,
	) -> CoreResult<SmartListItems> {
		let grouping = self.default_grouping;
		let params = self.into_params();

		match grouping {
			SmartListItemGrouping::ByBooks => {
				let books = client
					.media()
					.find_many(params)
					.with(media::metadata::fetch())
					.with(media::read_progresses::fetch(vec![
						read_progress::user_id::equals(for_user.id.clone()),
					]))
					.exec()
					.await?;

				Ok(SmartListItems::Books(
					books.into_iter().map(Media::from).collect(),
				))
			},
			SmartListItemGrouping::BySeries => {
				let books = client
					.media()
					.find_many(params)
					.with(media::metadata::fetch())
					.with(media::read_progresses::fetch(vec![
						read_progress::user_id::equals(for_user.id.clone()),
					]))
					.exec()
					.await?;

				let mut series_map = HashMap::new();
				for book in books {
					if let Some(series_id) = book.series_id.as_deref() {
						series_map
							.entry(series_id.to_string())
							.or_insert_with(Vec::new)
							.push(Media::from(book));
					} else {
						tracing::warn!(book_id = ?book.id, "Book has no series ID!");
					}
				}

				let series_ids = series_map.keys().cloned().collect::<Vec<_>>();

				let series = client
					.series()
					.find_many(vec![series::id::in_vec(series_ids)])
					.with(series::metadata::fetch())
					.exec()
					.await?;

				let grouped_books = series
					.into_iter()
					.filter_map(|series| {
						let series_id = series.id.clone();
						series_map
							.remove(&series_id)
							.map(|books| SmartListItemGroup {
								entity: Series::from(series),
								books,
							})
					})
					.collect::<Vec<_>>();

				Ok(SmartListItems::Series(grouped_books))
			},
			SmartListItemGrouping::ByLibrary => {
				let books = client
					.media()
					.find_many(params)
					.include(media_grouped_by_library::include(vec![
						read_progress::user_id::equals(for_user.id.clone()),
					]))
					.exec()
					.await?;

				let mut library_map = HashMap::new();
				for book in books {
					if let Some(Some(library_id)) =
						book.series.as_ref().map(|s| s.library_id.as_deref())
					{
						library_map
							.entry(library_id.to_string())
							.or_insert_with(Vec::new)
							.push(Media::from(book));
					} else {
						tracing::warn!(book_id = ?book.id, "Book has no library ID!");
					}
				}

				let library_ids = library_map.keys().cloned().collect::<Vec<_>>();

				let libraries = client
					.library()
					.find_many(vec![library::id::in_vec(library_ids)])
					.exec()
					.await?;

				let grouped_books = libraries
					.into_iter()
					.filter_map(|library| {
						let library_id = library.id.clone();
						library_map
							.remove(&library_id)
							.map(|books| SmartListItemGroup {
								entity: Library::from(library),
								books,
							})
					})
					.collect::<Vec<_>>();

				Ok(SmartListItems::Library(grouped_books))
			},
		}
	}
}

impl TryFrom<smart_list::Data> for SmartList {
	type Error = CoreError;

	fn try_from(value: smart_list::Data) -> Result<Self, Self::Error> {
		Ok(Self {
			id: value.id,
			name: value.name,
			description: value.description,
			filters: serde_json::from_slice(&value.filters).map_err(|e| {
				tracing::error!(?e, "Failed to deserialize smart list filters");
				CoreError::InternalError(e.to_string())
			})?,
			joiner: FilterJoin::from_str(&value.joiner).map_err(|e| {
				tracing::error!(?e, "Failed to deserialize smart list joiner");
				CoreError::InternalError(e.to_string())
			})?,
			default_grouping: SmartListItemGrouping::from_str(&value.default_grouping)
				.unwrap_or_else(|e| {
					tracing::error!(?e, "Failed to convert smart list default grouping");
					SmartListItemGrouping::ByBooks
				}),
		})
	}
}
