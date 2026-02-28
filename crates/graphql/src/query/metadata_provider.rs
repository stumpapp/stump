use crate::{
	data::CoreContext, guard::PermissionGuard,
	input::metadata_provider::MetadataFetchRecordId,
	object::metadata_fetch_record::MetadataFetchRecord,
};
use async_graphql::{Context, Object, Result};
use models::{
	entity::{metadata_fetch_record, metadata_provider_config},
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

	#[graphql(guard = "PermissionGuard::one(UserPermission::MetadataFetchRecordRead)")]
	async fn metadata_fetch_record(
		&self,
		ctx: &Context<'_>,
		id: MetadataFetchRecordId,
	) -> Result<Option<MetadataFetchRecord>> {
		let conn = ctx.data::<CoreContext>()?.conn.as_ref();

		let (col, value) = match id {
			MetadataFetchRecordId::Media(media_id) => {
				(metadata_fetch_record::Column::MediaId, media_id)
			},
			MetadataFetchRecordId::Series(series_id) => {
				(metadata_fetch_record::Column::SeriesId, series_id)
			},
		};

		let record = metadata_fetch_record::Entity::find()
			.filter(col.eq(value))
			.one(conn)
			.await?;

		Ok(record.map(MetadataFetchRecord::from))
	}

	/// Return all metadata fetch records that are awaiting user review.
	#[graphql(guard = "PermissionGuard::one(UserPermission::MetadataFetchRecordRead)")]
	async fn pending_metadata_matches(
		&self,
		ctx: &Context<'_>,
	) -> Result<Vec<MetadataFetchRecord>> {
		let conn = ctx.data::<CoreContext>()?.conn.as_ref();

		let records = metadata_fetch_record::Entity::find()
			.filter(
				metadata_fetch_record::Column::Status
					.eq(MetadataFetchStatus::AwaitingReview),
			)
			.all(conn)
			.await?;

		Ok(records.into_iter().map(MetadataFetchRecord::from).collect())
	}
}
