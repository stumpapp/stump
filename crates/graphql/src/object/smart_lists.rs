use crate::{
	data::{AuthContext, CoreContext, ServiceContext},
	input::smart_lists::SmartListFilterGroupInput,
	object::{
		media::Media, smart_list_item::SmartListItems, smart_list_view::SmartListView,
	},
	query::smart_lists_builder::{build_books_query, build_smart_list_items},
};
use async_graphql::{ComplexObject, Context, Result, SimpleObject};
use models::{
	entity::{media, series, smart_list, smart_list_view},
	shared::image::ImageRef,
};
use sea_orm::{QuerySelect, TransactionTrait};
use std::collections::HashSet;

#[derive(Debug, SimpleObject)]
pub struct SmartListMeta {
	pub matched_books: i64,
	pub matched_series: i64,
	pub matched_libraries: i64,
}

#[derive(Debug, SimpleObject)]
#[graphql(complex)]
pub struct SmartList {
	#[graphql(flatten)]
	pub model: smart_list::Model,
}

impl From<smart_list::Model> for SmartList {
	fn from(entity: smart_list::Model) -> Self {
		Self { model: entity }
	}
}

#[ComplexObject]
impl SmartList {
	async fn filters(&self) -> Result<String> {
		let filters: Vec<SmartListFilterGroupInput> =
			serde_json::from_slice(&self.model.filters)?;
		Ok(serde_json::to_string(&filters)?)
	}

	// TODO(thumb-placeholders): We need to refactor how non-book thumbs are handled so we can pull
	// dimensions/metadata here.
	async fn thumbnail(&self, ctx: &Context<'_>) -> Result<ImageRef> {
		let service = ctx.data::<ServiceContext>()?;
		Ok(ImageRef {
			// FIXME(graphql): Make thumbnails endpoint
			url: service
				.format_url(format!("/api/v2/smart-lists/{}/thumbnail", self.model.id)),
			..Default::default()
		})
	}

	async fn views(&self, ctx: &Context<'_>) -> Result<Vec<SmartListView>> {
		let conn = ctx.data::<CoreContext>()?.conn.as_ref();
		let views = smart_list_view::Entity::find_by_list_id(&self.model.id)
			.all(conn)
			.await?;
		views
			.into_iter()
			.map(SmartListView::try_from)
			.collect::<Result<Vec<_>, _>>()
	}

	async fn books(
		&self,
		ctx: &Context<'_>,
		#[graphql(default)] limit: Option<u64>,
	) -> Result<Vec<Media>> {
		let AuthContext { user, .. } = ctx.data::<AuthContext>()?;
		let conn = ctx.data::<CoreContext>()?.conn.as_ref();
		let txn = conn.begin().await?;

		let smart_list =
			smart_list::Entity::find_by_id(user, self.model.id.clone().into())
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

		txn.commit().await?;

		let books: Vec<Media> = models.into_iter().map(Media::from).collect();

		Ok(books)
	}

	async fn items(
		&self,
		ctx: &Context<'_>,
		#[graphql(default)] limit: Option<u64>,
	) -> Result<SmartListItems> {
		let AuthContext { user, .. } = ctx.data::<AuthContext>()?;
		let conn = ctx.data::<CoreContext>()?.conn.as_ref();
		let txn = conn.begin().await?;

		let smart_list =
			smart_list::Entity::find_by_id(user, self.model.id.clone().into())
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

	async fn meta(&self, ctx: &Context<'_>) -> Result<SmartListMeta> {
		let AuthContext { user, .. } = ctx.data::<AuthContext>()?;
		let conn = ctx.data::<CoreContext>()?.conn.as_ref();
		let txn = conn.begin().await?;

		let smart_list =
			smart_list::Entity::find_by_id(user, self.model.id.clone().into())
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

		Ok(SmartListMeta {
			matched_books,
			matched_series: matched_series.len() as i64,
			matched_libraries: matched_libraries.len() as i64,
		})
	}
}
