use std::{collections::HashMap, str::FromStr};

use prisma_client_rust::operator;
use serde::{Deserialize, Serialize};
use specta::Type;
use utoipa::ToSchema;

use crate::{
	db::{
		entity::{
			utils::apply_media_age_restriction, EntityVisibility, Library, Media, Series,
			User,
		},
		filter::{FilterGroup, FilterJoin, MediaSmartFilter, SmartFilter},
	},
	prisma::{
		active_reading_session, library, media, series, smart_list, user, PrismaClient,
	},
	utils::chain_optional_iter,
	CoreError, CoreResult,
};

use super::{
	prisma_macros::media_grouped_by_library, SmartListItemGroup, SmartListItemGrouping,
	SmartListItems, SmartListView,
};

#[derive(Debug, Clone, Serialize, Deserialize, Type, ToSchema)]
pub struct SmartList {
	pub id: String,
	pub name: String,
	pub description: Option<String>,
	pub filters: SmartFilter<MediaSmartFilter>,
	pub visibility: EntityVisibility,
	pub joiner: FilterJoin,
	pub default_grouping: SmartListItemGrouping,
	pub saved_views: Option<Vec<SmartListView>>,
	#[serde(skip_serializing_if = "Option::is_none")]
	pub creator_id: Option<String>,
}

impl SmartList {
	fn into_params(self) -> media::WhereParam {
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
			FilterJoin::And => operator::and(where_params),
			FilterJoin::Or => operator::or(where_params),
		}
	}

	pub fn into_params_for_user(self, user: &User) -> Vec<media::WhereParam> {
		let params = self.into_params();
		let age_restriction = user
			.age_restriction
			.as_ref()
			.map(|ar| apply_media_age_restriction(ar.age, ar.restrict_on_unset));
		let library_not_hidden_restriction =
			library::hidden_from_users::none(vec![user::id::equals(user.id.clone())]);

		let params_for_user = operator::and(chain_optional_iter(
			[
				params,
				media::series::is(vec![series::library::is(vec![
					library_not_hidden_restriction,
				])]),
			],
			[age_restriction],
		));

		vec![params_for_user]
	}

	/// MUST be called from within a transaction!
	pub async fn build(
		self,
		client: &PrismaClient,
		for_user: &User,
	) -> CoreResult<SmartListItems> {
		let grouping = self.default_grouping;
		let params_for_user = self.into_params_for_user(for_user);

		match grouping {
			SmartListItemGrouping::ByBooks => {
				let books = client
					.media()
					.find_many(params_for_user)
					.with(media::metadata::fetch())
					.with(media::active_user_reading_sessions::fetch(vec![
						active_reading_session::user_id::equals(for_user.id.clone()),
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
					.find_many(params_for_user)
					.with(media::metadata::fetch())
					.with(media::active_user_reading_sessions::fetch(vec![
						active_reading_session::user_id::equals(for_user.id.clone()),
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
					.find_many(params_for_user)
					.include(media_grouped_by_library::include(for_user.id.clone()))
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
		let saved_views = if let Ok(stored) = value.saved_views() {
			Some(
				stored
					.iter()
					.cloned()
					.map(SmartListView::try_from)
					.collect::<Result<Vec<SmartListView>, CoreError>>()?,
			)
		} else {
			None
		};

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
			visibility: EntityVisibility::from_str(&value.visibility).map_err(|e| {
				tracing::error!(?e, "Failed to deserialize smart list visibility");
				CoreError::InternalError(e.to_string())
			})?,
			saved_views,
			creator_id: Some(value.creator_id),
		})
	}
}
