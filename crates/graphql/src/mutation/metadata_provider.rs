use crate::{
	data::CoreContext,
	guard::PermissionGuard,
	input::metadata_provider::{
		CreateMetadataProviderConfigInput, PatchMetadataProviderConfigInput,
	},
};
use async_graphql::{Context, Object, Result};
use metadata_integrations::{MatchCandidate, MergeStrategy, MetadataField};
use models::{
	entity::{metadata_fetch_record, metadata_provider_config},
	shared::enums::{MetadataFetchStatus, UserPermission},
};
use sea_orm::{prelude::*, IntoActiveModel, Set, TransactionTrait, TryIntoModel};

#[derive(Default)]
pub struct MetadataProviderMutation;

#[Object]
impl MetadataProviderMutation {
	// TODO: Do we actually care about duplicates? I feel like not, like why not? So for
	// now I'll leave as-is
	#[graphql(guard = "PermissionGuard::one(UserPermission::MetadataProviderManage)")]
	async fn create_metadata_provider(
		&self,
		ctx: &Context<'_>,
		input: CreateMetadataProviderConfigInput,
	) -> Result<metadata_provider_config::Model> {
		let core_ctx = ctx.data::<CoreContext>()?;
		let conn = core_ctx.conn.as_ref();
		let encryption_key = core_ctx.get_encryption_key().await?;

		let active_model = input.try_into_active_model(&encryption_key).await?;
		let result = active_model.save(conn).await?.try_into_model()?;

		Ok(result)
	}

	#[graphql(guard = "PermissionGuard::one(UserPermission::MetadataProviderManage)")]
	async fn update_metadata_provider(
		&self,
		ctx: &Context<'_>,
		id: i32,
		input: PatchMetadataProviderConfigInput,
	) -> Result<metadata_provider_config::Model> {
		let core_ctx = ctx.data::<CoreContext>()?;
		let conn = core_ctx.conn.as_ref();
		let encryption_key = core_ctx.get_encryption_key().await?;

		let existing = metadata_provider_config::Entity::find_by_id(id)
			.one(conn)
			.await?
			.ok_or("Metadata provider config not found")?;

		let active_model = input.apply_to_model(existing, &encryption_key).await?;
		let result = active_model.save(conn).await?.try_into_model()?;

		Ok(result)
	}

	#[graphql(guard = "PermissionGuard::one(UserPermission::MetadataProviderManage)")]
	async fn delete_metadata_provider(
		&self,
		ctx: &Context<'_>,
		id: i32,
	) -> Result<metadata_provider_config::Model> {
		let conn = ctx.data::<CoreContext>()?.conn.as_ref();

		let model = metadata_provider_config::Entity::find_by_id(id)
			.one(conn)
			.await?
			.ok_or("Metadata provider config not found")?;

		metadata_provider_config::Entity::delete_by_id(id)
			.exec(conn)
			.await?;

		Ok(model)
	}

	/// Accept the top-ranked candidate for all pending metadata matches
	#[graphql(guard = "PermissionGuard::one(UserPermission::MetadataFetchRecordManage)")]
	async fn accept_all_pending_matches(
		&self,
		ctx: &Context<'_>,
		strategy: Option<MergeStrategy>,
		exclude_fields: Option<Vec<MetadataField>>,
	) -> Result<u32> {
		let conn = ctx.data::<CoreContext>()?.conn.as_ref();
		let strategy = strategy.unwrap_or(MergeStrategy::FillGaps);
		let exclude_fields = exclude_fields.unwrap_or_default();

		let pending = metadata_fetch_record::Entity::find()
			.filter(
				metadata_fetch_record::Column::Status
					.eq(MetadataFetchStatus::AwaitingReview),
			)
			.all(conn)
			.await?;

		let tx = conn.begin().await?;
		let mut accepted = 0u32;

		for record in pending {
			let candidates: Vec<MatchCandidate> = record
				.match_candidates
				.as_ref()
				.and_then(|v| serde_json::from_value(v.clone()).ok())
				.unwrap_or_default();

			let Some(candidate) = candidates.first() else {
				continue;
			};

			let result = if record.media_id.is_some() {
				stump_core::filesystem::metadata::apply_media_match(
					&tx,
					record.media_id.as_deref().unwrap(),
					candidate,
					strategy,
					exclude_fields.clone(),
					vec![],
				)
				.await
			} else if record.series_id.is_some() {
				stump_core::filesystem::metadata::apply_series_match(
					&tx,
					record.series_id.as_deref().unwrap(),
					candidate,
					strategy,
					exclude_fields.clone(),
					vec![],
				)
				.await
			} else {
				continue;
			};

			match result {
				Ok(()) => accepted += 1,
				Err(e) => {
					tracing::error!(
						record_id = record.id,
						error = ?e,
						"Failed to auto-accept pending match"
					);
				},
			}
		}

		tx.commit().await?;

		Ok(accepted)
	}

	/// Reject all pending metadata matches, setting their status to NoMatch
	#[graphql(guard = "PermissionGuard::one(UserPermission::MetadataFetchRecordManage)")]
	async fn reject_all_pending_matches(&self, ctx: &Context<'_>) -> Result<u32> {
		let conn = ctx.data::<CoreContext>()?.conn.as_ref();

		let pending = metadata_fetch_record::Entity::find()
			.filter(
				metadata_fetch_record::Column::Status
					.eq(MetadataFetchStatus::AwaitingReview),
			)
			.all(conn)
			.await?;

		let count = pending.len() as u32;
		let tx = conn.begin().await?;

		for record in pending {
			let mut active = record.into_active_model();
			active.status = Set(MetadataFetchStatus::NoMatch);
			active.match_candidates = Set(None);
			metadata_fetch_record::Entity::update(active)
				.exec(&tx)
				.await?;
		}

		tx.commit().await?;

		Ok(count)
	}
}
