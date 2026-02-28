use crate::{
	data::CoreContext, guard::PermissionGuard,
	input::metadata_provider::MetadataFetchStatusId,
};
use async_graphql::{Context, Object, Result};
use models::{
	entity::{metadata_fetch_status, metadata_provider_config},
	shared::enums::{MetadataFetchStatus, UserPermission},
};
use sea_orm::prelude::*;

#[derive(Default)]
pub struct MetadataProviderQuery;

#[Object]
impl MetadataProviderQuery {
	#[graphql(guard = "PermissionGuard::one(UserPermission::MetadataProviderRead)")]
	async fn metadata_provider_configs(
		&self,
		ctx: &Context<'_>,
	) -> Result<Vec<metadata_provider_config::Model>> {
		let conn = ctx.data::<CoreContext>()?.conn.as_ref();
		let configs = metadata_provider_config::Entity::find().all(conn).await?;
		Ok(configs)
	}

	#[graphql(guard = "PermissionGuard::one(UserPermission::MetadataProviderRead)")]
	async fn metadata_provider_config_by_id(
		&self,
		ctx: &Context<'_>,
		id: i32,
	) -> Result<Option<metadata_provider_config::Model>> {
		let conn = ctx.data::<CoreContext>()?.conn.as_ref();
		let config = metadata_provider_config::Entity::find_by_id(id)
			.one(conn)
			.await?;
		Ok(config)
	}

	#[graphql(guard = "PermissionGuard::one(UserPermission::MetadataFetchStatusRead)")]
	async fn metadata_fetch_status(
		&self,
		ctx: &Context<'_>,
		id: MetadataFetchStatusId,
	) -> Result<Option<metadata_fetch_status::Model>> {
		let conn = ctx.data::<CoreContext>()?.conn.as_ref();

		let (col, value) = match id {
			MetadataFetchStatusId::Media(media_id) => {
				(metadata_fetch_status::Column::MediaId, media_id)
			},
			MetadataFetchStatusId::Series(series_id) => {
				(metadata_fetch_status::Column::SeriesId, series_id)
			},
		};

		let status = metadata_fetch_status::Entity::find()
			.filter(col.eq(value))
			.one(conn)
			.await?;

		Ok(status)
	}

	/// Return all metadata fetch statuses that are awaiting user review.
	#[graphql(guard = "PermissionGuard::one(UserPermission::MetadataFetchStatusRead)")]
	async fn pending_metadata_matches(
		&self,
		ctx: &Context<'_>,
	) -> Result<Vec<metadata_fetch_status::Model>> {
		let conn = ctx.data::<CoreContext>()?.conn.as_ref();

		let statuses = metadata_fetch_status::Entity::find()
			.filter(
				metadata_fetch_status::Column::Status
					.eq(MetadataFetchStatus::AwaitingReview),
			)
			.all(conn)
			.await?;

		Ok(statuses)
	}
}
