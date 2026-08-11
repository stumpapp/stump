use std::collections::{HashMap, HashSet};

use async_graphql::{
	dataloader::DataLoader, ComplexObject, Context, Result, SimpleObject,
};

use models::{
	entity::{
		library, library_config, library_exclusion, library_scan_record, library_tag,
		media, media_metadata, series, tag, user,
	},
	shared::{
		alphabet::{AvailableAlphabet, EntityLetter},
		enums::UserPermission,
		image::ImageRef,
		ordering::OrderDirection,
	},
};
use sea_orm::{
	prelude::*, sea_query::Query, FromQueryResult, QueryOrder, QuerySelect, QueryTrait,
};

use crate::{
	data::{AuthContext, CoreContext, ServiceContext},
	guard::PermissionGuard,
	loader::favorite::{FavoriteLibraryLoaderKey, FavoritesLoader},
	object::{library_scan_record::LibraryScanRecord, media::Media, stats::LibraryStats},
	utils::db_statement,
};

use super::{
	author::Author, library_config::LibraryConfig, series::Series, tag::Tag, user::User,
};

#[derive(Clone, Debug, SimpleObject)]
#[graphql(complex)]
pub struct Library {
	#[graphql(flatten)]
	pub model: library::Model,
}

impl From<library::Model> for Library {
	fn from(model: library::Model) -> Self {
		Self { model }
	}
}

#[ComplexObject]
impl Library {
	async fn authors(&self, ctx: &Context<'_>) -> Result<Vec<Author>> {
		let conn = ctx.data::<CoreContext>()?.conn.as_ref();

		let writers: Vec<String> = media_metadata::Entity::find()
			.select_only()
			.column(media_metadata::Column::Writers)
			.distinct()
			.join_rev(
				sea_orm::JoinType::InnerJoin,
				media::Entity::belongs_to(media_metadata::Entity)
					.from(media::Column::Id)
					.to(media_metadata::Column::MediaId)
					.into(),
			)
			.filter(
				media::Column::SeriesId.in_subquery(
					Query::select()
						.column(series::Column::Id)
						.from(series::Entity)
						.and_where(series::Column::LibraryId.eq(self.model.id.clone()))
						.to_owned(),
				),
			)
			.filter(media_metadata::Column::Writers.is_not_null())
			.into_tuple()
			.all(conn)
			.await?;

		let unique_names: std::collections::BTreeSet<String> = writers
			.into_iter()
			.flat_map(|w| {
				w.split(',')
					.map(|s| s.trim().to_string())
					.filter(|s| !s.is_empty())
					.collect::<Vec<String>>()
			})
			.collect();

		let library_id = Some(self.model.id.clone());
		let authors = unique_names
			.into_iter()
			.map(|name| Author {
				name,
				// Note: This is a little fuzzy tbh and feels counterintuitive at a glance. My
				// rationale here is that in the context of a library, an author has no role. We only
				// care about surfacing all authors here.
				role: None,
				library_id: library_id.clone(),
			})
			.collect();

		Ok(authors)
	}

	async fn config(&self, ctx: &Context<'_>) -> Result<LibraryConfig> {
		let conn = ctx.data::<CoreContext>()?.conn.as_ref();

		let config = library_config::Entity::find()
			.filter(library_config::Column::Id.eq(self.model.config_id))
			.one(conn)
			.await?
			.ok_or("Library config not found")?;

		Ok(config.into())
	}

	#[graphql(
		guard = "PermissionGuard::new(&[UserPermission::ReadUsers, UserPermission::ManageLibrary])"
	)]
	async fn excluded_users(&self, ctx: &Context<'_>) -> Result<Vec<User>> {
		let conn = ctx.data::<CoreContext>()?.conn.as_ref();

		let users = user::Entity::find()
			.filter(
				user::Column::Id.in_subquery(
					Query::select()
						.column(library_exclusion::Column::UserId)
						.from(library_exclusion::Entity)
						.and_where(
							library_exclusion::Column::LibraryId
								.eq(self.model.id.clone()),
						)
						.to_owned(),
				),
			)
			.all(conn)
			.await?;

		Ok(users.into_iter().map(User::from).collect())
	}

	async fn is_favorite(&self, ctx: &Context<'_>) -> Result<bool> {
		let AuthContext { user, .. } = ctx.data::<AuthContext>()?;
		let loader = ctx.data::<DataLoader<FavoritesLoader>>()?;

		let is_favorite = loader
			.load_one(FavoriteLibraryLoaderKey {
				user_id: user.id.clone(),
				library_id: self.model.id.clone(),
			})
			.await?;

		Ok(is_favorite.unwrap_or(false))
	}

	/// Get the details of the last scan job for this library, if any exists.
	async fn last_scan(&self, ctx: &Context<'_>) -> Result<Option<LibraryScanRecord>> {
		let conn = ctx.data::<CoreContext>()?.conn.as_ref();

		let record = library_scan_record::Entity::find()
			.filter(library_scan_record::Column::LibraryId.eq(self.model.id.clone()))
			.order_by_desc(library_scan_record::Column::Timestamp)
			.one(conn)
			.await?;

		Ok(record.map(LibraryScanRecord::from))
	}

	// TODO(perf): We probably could put this behind a dataloader if used frequently
	/// Get media in this library
	async fn media(
		&self,
		ctx: &Context<'_>,
		#[graphql(default, validator(minimum = 1))] take: Option<u64>,
	) -> Result<Vec<Media>> {
		let AuthContext { user, .. } = ctx.data::<AuthContext>()?;
		let conn = ctx.data::<CoreContext>()?.conn.as_ref();

		let models = media::ModelWithMetadata::find_for_user(user)
			.filter(
				media::Column::SeriesId.in_subquery(
					Query::select()
						.column(series::Column::Id)
						.from(series::Entity)
						.and_where(series::Column::LibraryId.eq(self.model.id.clone()))
						.to_owned(),
				),
			)
			// TODO: Consider allowing custom ordering?
			.order_by_asc(media::Column::Name)
			.apply_if(take, |query, take| query.limit(take))
			.into_model::<media::ModelWithMetadata>()
			.all(conn)
			.await?;

		Ok(models.into_iter().map(Media::from).collect())
	}

	async fn media_alphabet(&self, ctx: &Context<'_>) -> Result<HashMap<String, i64>> {
		let conn = ctx.data::<CoreContext>()?.conn.as_ref();

		let query_result = conn
			.query_all(db_statement(
				conn,
				r"
				SELECT
					substr(COALESCE(media_metadata.title, media.name), 1, 1) AS letter,
					COUNT(DISTINCT media.id) AS count
				FROM
					media
				LEFT JOIN media_metadata ON media.id = media_metadata.media_id
				WHERE
					media.series_id IN (
						SELECT series.id
						FROM series
						WHERE series.library_id = $1
					)
				GROUP BY
					letter
				ORDER BY
					letter ASC;
				",
				[self.model.id.clone().into()],
			))
			.await?;

		let result = query_result
			.into_iter()
			.map(|res| EntityLetter::from_query_result(&res, "").map_err(|e| e.into()))
			.collect::<Result<Vec<EntityLetter>>>()?;

		let alphabet = AvailableAlphabet::from(result);

		Ok(alphabet.get())
	}

	/// Get the full history of scan jobs for this library.
	async fn scan_history(&self, ctx: &Context<'_>) -> Result<Vec<LibraryScanRecord>> {
		let conn = ctx.data::<CoreContext>()?.conn.as_ref();

		let records = library_scan_record::Entity::find()
			.filter(library_scan_record::Column::LibraryId.eq(self.model.id.clone()))
			.order_by_desc(library_scan_record::Column::Timestamp)
			.all(conn)
			.await?;

		Ok(records.into_iter().map(LibraryScanRecord::from).collect())
	}

	// TODO(perf): We probably could put this behind a dataloader if used frequently
	/// Get series in this library
	async fn series(
		&self,
		ctx: &Context<'_>,
		#[graphql(default, validator(minimum = 1))] take: Option<u64>,
		#[graphql(default, validator(minimum = 0))] skip: Option<u64>,
	) -> Result<Vec<Series>> {
		let conn = ctx.data::<CoreContext>()?.conn.as_ref();

		let models = series::ModelWithMetadata::find()
			.filter(series::Column::LibraryId.eq(Some(self.model.id.clone())))
			// TODO: Consider allowing custom ordering?
			.order_by_asc(series::Column::Name)
			.apply_if(take, |query, take| query.limit(take))
			.apply_if(skip, |query, skip| query.offset(skip))
			.into_model::<series::ModelWithMetadata>()
			.all(conn)
			.await?;

		Ok(models.into_iter().map(Series::from).collect())
	}

	async fn series_alphabet(&self, ctx: &Context<'_>) -> Result<HashMap<String, i64>> {
		let conn = ctx.data::<CoreContext>()?.conn.as_ref();

		let query_result = conn
			.query_all(db_statement(
				conn,
				r"
				SELECT
					substr(COALESCE(series_metadata.title, series.name), 1, 1) AS letter,
					COUNT(DISTINCT series.id) AS count
				FROM
					series
				LEFT JOIN series_metadata ON series.id = series_metadata.series_id
				WHERE
					series.library_id = $1
				GROUP BY
					letter
				ORDER BY
					letter ASC;
				",
				[self.model.id.clone().into()],
			))
			.await?;

		let result = query_result
			.into_iter()
			.map(|res| EntityLetter::from_query_result(&res, "").map_err(|e| e.into()))
			.collect::<Result<Vec<EntityLetter>>>()?;

		let alphabet = AvailableAlphabet::from(result);

		Ok(alphabet.get())
	}

	async fn stats(
		&self,
		ctx: &Context<'_>,
		all_users: Option<bool>,
	) -> Result<LibraryStats> {
		let AuthContext { user, .. } = ctx.data::<AuthContext>()?;
		let conn = ctx.data::<CoreContext>()?.conn.as_ref();

		let stats = LibraryStats::fetch(
			conn,
			Some(self.model.id.clone()),
			user.id.clone(),
			all_users.unwrap_or(false),
		)
		.await?;

		Ok(stats)
	}

	async fn genres(
		&self,
		ctx: &Context<'_>,
		#[graphql(default)] sort: Option<OrderDirection>,
	) -> Result<Vec<String>> {
		let conn = ctx.data::<CoreContext>()?.conn.as_ref();

		let genre_strings = get_unique_str_list_metadata_fields(
			self,
			media_metadata::Column::Genres,
			sort.unwrap_or(OrderDirection::Asc),
			conn,
		)
		.await?;

		Ok(genre_strings)
	}

	async fn publishers(
		&self,
		ctx: &Context<'_>,
		#[graphql(default)] sort: Option<OrderDirection>,
	) -> Result<Vec<String>> {
		let conn = ctx.data::<CoreContext>()?.conn.as_ref();

		let publisher_strings = get_unique_metadata_fields(
			self,
			media_metadata::Column::Publisher,
			sort.unwrap_or(OrderDirection::Asc),
			conn,
		)
		.await?;

		Ok(publisher_strings)
	}

	async fn tags(&self, ctx: &Context<'_>) -> Result<Vec<Tag>> {
		let conn = ctx.data::<CoreContext>()?.conn.as_ref();

		let models = tag::Entity::find()
			.filter(
				tag::Column::Id.in_subquery(
					Query::select()
						.column(library_tag::Column::TagId)
						.from(library_tag::Entity)
						.and_where(
							library_tag::Column::LibraryId.eq(self.model.id.clone()),
						)
						.to_owned(),
				),
			)
			.all(conn)
			.await?;

		Ok(models.into_iter().map(Tag::from).collect())
	}

	/// A reference to the thumbnail image for the thumbnail. This will be a fully
	/// qualified URL to the image.
	async fn thumbnail(&self, ctx: &Context<'_>) -> Result<ImageRef> {
		let service = ctx.data::<ServiceContext>()?;

		let dimensions = self
			.model
			.thumbnail_meta
			.as_ref()
			.and_then(|meta| meta.dimensions.as_ref())
			.map(|dim| (dim.width, dim.height));

		Ok(ImageRef {
			url: service
				.format_url(format!("/api/v2/library/{}/thumbnail", self.model.id)),
			height: dimensions.map(|(_, height)| height),
			width: dimensions.map(|(width, _)| width),
			metadata: self.model.thumbnail_meta.clone(),
		})
	}
}

async fn get_unique_metadata_fields(
	library: &Library,
	column: media_metadata::Column,
	sort: OrderDirection,
	conn: &DatabaseConnection,
) -> Result<Vec<String>> {
	let values = media_metadata::Entity::find()
		.select_only()
		.column(column)
		.distinct()
		.filter(column.is_not_null())
		// just a lil inefficient
		.filter(
			media_metadata::Column::MediaId.in_subquery(
				Query::select()
					.column(media::Column::Id)
					.from(media::Entity)
					.and_where(
						media::Column::SeriesId.in_subquery(
							Query::select()
								.column(series::Column::Id)
								.from(series::Entity)
								.and_where(
									series::Column::LibraryId
										.eq(library.model.id.clone()),
								)
								.to_owned(),
						),
					)
					.to_owned(),
			),
		)
		.order_by(column, sort.into())
		.into_tuple::<String>()
		.all(conn)
		.await?;

	Ok(values)
}

/// Get unique values from fields which are string arrays
async fn get_unique_str_list_metadata_fields(
	library: &Library,
	column: media_metadata::Column,
	sort: OrderDirection,
	conn: &DatabaseConnection,
) -> Result<Vec<String>> {
	let csv_list = media_metadata::Entity::find()
		.select_only()
		.column(column)
		.distinct()
		.filter(column.is_not_null())
		// just a lil inefficient
		.filter(
			media_metadata::Column::MediaId.in_subquery(
				Query::select()
					.column(media::Column::Id)
					.from(media::Entity)
					.and_where(
						media::Column::SeriesId.in_subquery(
							Query::select()
								.column(series::Column::Id)
								.from(series::Entity)
								.and_where(
									series::Column::LibraryId
										.eq(library.model.id.clone()),
								)
								.to_owned(),
						),
					)
					.to_owned(),
			),
		)
		.into_tuple::<String>()
		.all(conn)
		.await?;

	let mut unique_values = HashSet::new();
	for csv in csv_list {
		for value in csv.split(',') {
			if !value.trim().is_empty() {
				unique_values.insert(value.trim().to_string());
			}
		}
	}

	let sorted_values = {
		let mut vec: Vec<String> = unique_values.into_iter().collect();
		match sort {
			OrderDirection::Asc => vec.sort(),
			OrderDirection::Desc => vec.sort_by(|a, b| b.cmp(a)),
		}
		vec
	};

	Ok(sorted_values)
}
