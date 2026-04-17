use async_graphql::{Context, Object, Result, ID};
use metadata_integrations::{
	MatchCandidate, MergeStrategy, MetadataField, MetadataFieldOverride,
};
use models::{
	entity::{media, media_metadata, metadata_fetch_record, series, series_metadata},
	shared::enums::{MetadataFetchStatus, MetadataResetImpact, UserPermission},
};
use sea_orm::{prelude::*, sea_query::Query, IntoActiveModel, Set, TransactionTrait};
use stump_core::filesystem::metadata::ProviderClientCache;

use crate::{
	data::{AuthContext, CoreContext},
	guard::PermissionGuard,
	input::series::SeriesMetadataInput,
	object::{metadata_fetch_record::MetadataFetchRecord, series::Series},
};

#[derive(Default)]
pub struct SeriesMetadataMutation;

#[Object]
impl SeriesMetadataMutation {
	#[graphql(guard = "PermissionGuard::one(UserPermission::EditMetadata)")]
	async fn update_series_metadata(
		&self,
		ctx: &Context<'_>,
		id: ID,
		input: SeriesMetadataInput,
	) -> Result<Series> {
		let AuthContext { user, .. } = ctx.data::<AuthContext>()?;
		let conn = ctx.data::<CoreContext>()?.conn.as_ref();

		let model = series::ModelWithMetadata::find_for_user(user)
			.filter(series::Column::Id.eq(id.to_string()))
			.into_model::<series::ModelWithMetadata>()
			.one(conn)
			.await?
			.ok_or("Series not found")?;

		let mut active_model = input.into_active_model();
		active_model.series_id = Set(model.series.id.clone());

		let updated_metadata = if model.metadata.is_some() {
			active_model.update(conn).await?
		} else {
			active_model.insert(conn).await?
		};

		let model = series::ModelWithMetadata {
			series: model.series,
			metadata: Some(updated_metadata),
		};

		Ok(model.into())
	}

	#[graphql(guard = "PermissionGuard::one(UserPermission::EditMetadata)")]
	async fn reset_series_metadata(
		&self,
		ctx: &Context<'_>,
		id: ID,
		impact: MetadataResetImpact,
	) -> Result<Series> {
		let AuthContext { user, .. } = ctx.data::<AuthContext>()?;
		let core = ctx.data::<CoreContext>()?;
		let conn = core.conn.as_ref();

		let mut model = series::ModelWithMetadata::find_for_user(user)
			.filter(series::Column::Id.eq(id.to_string()))
			.into_model::<series::ModelWithMetadata>()
			.one(conn)
			.await?
			.ok_or("Series not found")?;

		let tx = conn.begin().await?;

		if matches!(
			impact,
			MetadataResetImpact::Series | MetadataResetImpact::Everything
		) {
			if let Some(metadata) = model.metadata.take() {
				metadata.delete(&tx).await?;
			} else {
				tracing::debug!(series_id = ?model.series.id, "No metadata to reset");
			}
		}

		if matches!(
			impact,
			MetadataResetImpact::Books | MetadataResetImpact::Everything
		) {
			let media_metadata_models = media_metadata::Entity::find()
				.filter(
					media_metadata::Column::MediaId.in_subquery(
						Query::select()
							.column(media::Column::Id)
							.from(media::Entity)
							.and_where(
								media::Column::SeriesId.eq(model.series.id.clone()),
							)
							.to_owned(),
					),
				)
				.all(&tx)
				.await?;
			tracing::trace!(
				count = media_metadata_models.len(),
				"Found media metadata to delete"
			);

			for media_metadata in media_metadata_models {
				media_metadata.delete(&tx).await?;
			}
		}

		tx.commit().await?;

		tracing::debug!(?impact, series_id = ?model.series.id, "Reset metadata for series");

		Ok(model.into())
	}

	/// Search external metadata providers for a series and return match candidates
	#[graphql(guard = "PermissionGuard::one(UserPermission::MetadataFetchRecordManage)")]
	async fn fetch_series_metadata(
		&self,
		ctx: &Context<'_>,
		id: ID,
	) -> Result<Vec<MatchCandidate>> {
		let AuthContext { .. } = ctx.data::<AuthContext>()?;
		let core_ctx = ctx.data::<CoreContext>()?;
		let conn = core_ctx.conn.as_ref();

		let model = series::ModelWithMetadata::find()
			.filter(series::Column::Id.eq(id.to_string()))
			.into_model::<series::ModelWithMetadata>()
			.one(conn)
			.await?
			.ok_or("Series not found")?;

		let encryption_key = core_ctx.get_encryption_key().await?;
		let provider_cache = ProviderClientCache::new(encryption_key);

		let search_name = model
			.metadata
			.as_ref()
			.and_then(|m| m.title.clone())
			.unwrap_or_else(|| model.series.name.clone());

		let candidates = stump_core::filesystem::metadata::fetch_series_metadata(
			conn,
			&model.series.id,
			&search_name,
			&provider_cache,
		)
		.await?;

		Ok(candidates)
	}

	/// Accept a match candidate and apply it to the series metadata
	#[graphql(guard = "PermissionGuard::one(UserPermission::MetadataFetchRecordManage)")]
	async fn accept_series_match(
		&self,
		ctx: &Context<'_>,
		series_id: ID,
		candidate_index: u32,
		strategy: Option<MergeStrategy>,
		exclude_fields: Option<Vec<MetadataField>>,
		overrides: Option<Vec<MetadataFieldOverride>>,
	) -> Result<MetadataFetchRecord> {
		let conn = ctx.data::<CoreContext>()?.conn.as_ref();
		let strategy = strategy.unwrap_or(MergeStrategy::FillGaps);
		let exclude_fields = exclude_fields.unwrap_or_default();
		let overrides = overrides.unwrap_or_default();

		let status = metadata_fetch_record::Entity::find()
			.filter(metadata_fetch_record::Column::SeriesId.eq(series_id.to_string()))
			.one(conn)
			.await?
			.ok_or("No fetch status found for this series")?;

		if status.status != MetadataFetchStatus::AwaitingReview {
			return Err(async_graphql::Error::new(format!(
				"Fetch status is {:?}, expected AwaitingReview",
				status.status
			)));
		}

		let candidates: Vec<MatchCandidate> = status
			.match_candidates
			.as_ref()
			.and_then(|v| serde_json::from_value(v.clone()).ok())
			.unwrap_or_default();

		let candidate = candidates
			.get(candidate_index as usize)
			.ok_or("Candidate index out of bounds")?;

		stump_core::filesystem::metadata::apply_series_match(
			conn,
			series_id.as_ref(),
			candidate,
			strategy,
			exclude_fields,
			overrides,
		)
		.await?;

		let updated = metadata_fetch_record::Entity::find()
			.filter(metadata_fetch_record::Column::SeriesId.eq(series_id.to_string()))
			.one(conn)
			.await?
			.ok_or("Failed to re-fetch status")?;

		Ok(MetadataFetchRecord::from(updated))
	}

	/// Reject the current match candidates for a series
	#[graphql(guard = "PermissionGuard::one(UserPermission::MetadataFetchRecordManage)")]
	async fn reject_series_match(
		&self,
		ctx: &Context<'_>,
		series_id: ID,
		candidate_index: u32,
	) -> Result<MetadataFetchRecord> {
		let conn = ctx.data::<CoreContext>()?.conn.as_ref();

		let status = metadata_fetch_record::Entity::find()
			.filter(metadata_fetch_record::Column::SeriesId.eq(series_id.to_string()))
			.one(conn)
			.await?
			.ok_or("No fetch status found for this series")?;

		let existing_candidates: Vec<MatchCandidate> = status
			.match_candidates
			.as_ref()
			.and_then(|v| serde_json::from_value(v.clone()).ok())
			.unwrap_or_default();

		if (candidate_index as usize) >= existing_candidates.len() {
			return Err(async_graphql::Error::new("Candidate index out of bounds"));
		}

		let adjusted_candidates = existing_candidates
			.into_iter()
			.enumerate()
			.filter(|(i, _)| *i != candidate_index as usize)
			.map(|(_, c)| c)
			.collect::<Vec<_>>();

		let mut active = status.into_active_model();
		if adjusted_candidates.is_empty() {
			active.status = Set(MetadataFetchStatus::NoMatch);
		}
		active.match_candidates = Set(Some(serde_json::to_value(adjusted_candidates)?));

		let updated = metadata_fetch_record::Entity::update(active)
			.exec(conn)
			.await?;

		Ok(MetadataFetchRecord::from(updated))
	}

	/// Set the locked metadata fields for a series
	#[graphql(guard = "PermissionGuard::one(UserPermission::EditMetadata)")]
	async fn set_series_locked_fields(
		&self,
		ctx: &Context<'_>,
		series_id: ID,
		locked_fields: Vec<MetadataField>,
	) -> Result<Series> {
		let AuthContext { user, .. } = ctx.data::<AuthContext>()?;
		let conn = ctx.data::<CoreContext>()?.conn.as_ref();

		let model = series::ModelWithMetadata::find_for_user(user)
			.filter(series::Column::Id.eq(series_id.to_string()))
			.into_model::<series::ModelWithMetadata>()
			.one(conn)
			.await?
			.ok_or("Series not found")?;

		let locked_json = serde_json::to_value(&locked_fields)?;

		let updated_metadata = if let Some(metadata) = model.metadata {
			let mut active = metadata.into_active_model();
			active.locked_fields = Set(Some(locked_json));
			active.update(conn).await?
		} else {
			let active = series_metadata::ActiveModel {
				series_id: Set(model.series.id.clone()),
				locked_fields: Set(Some(locked_json)),
				..Default::default()
			};
			active.insert(conn).await?
		};

		let model = series::ModelWithMetadata {
			series: model.series,
			metadata: Some(updated_metadata),
		};

		Ok(model.into())
	}
}
