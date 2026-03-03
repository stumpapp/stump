use metadata_integrations::{MatchCandidate, SearchQuery};
use models::{
	entity::{metadata_fetch_record, metadata_provider_config},
	shared::enums::MetadataFetchStatus,
};
use sea_orm::{prelude::*, sea_query::OnConflict, Set};

use super::{apply, ProviderClientCache};
use crate::CoreError;

/// Fetch metadata candidates for a series from all enabled providers
pub async fn fetch_series_metadata(
	conn: &DatabaseConnection,
	series_id: &str,
	series_name: &str,
	provider_cache: &ProviderClientCache,
) -> Result<Vec<MatchCandidate>, CoreError> {
	let provider_configs = metadata_provider_config::Entity::find()
		.filter(metadata_provider_config::Column::Enabled.eq(true))
		.all(conn)
		.await?;

	if provider_configs.is_empty() {
		return Err(CoreError::InternalError(
			"No enabled metadata providers configured".to_string(),
		));
	}

	let mut all_candidates: Vec<MatchCandidate> = Vec::new();

	for config in &provider_configs {
		match provider_cache.get_or_create(config).await {
			Ok(provider) => {
				let query = SearchQuery {
					title: series_name.to_string(),
					limit: Some(10),
					..Default::default()
				};

				match provider.search_series(&query).await {
					Ok(candidates) => {
						all_candidates.extend(candidates);
					},
					Err(e) => {
						tracing::error!(
							provider = ?config.provider_type,
							error = ?e,
							"Failed to search provider for series metadata"
						);
					},
				}
			},
			Err(e) => {
				tracing::error!(
					provider = ?config.provider_type,
					error = ?e,
					"Failed to get provider client"
				);
			},
		}
	}

	let status = if all_candidates.is_empty() {
		MetadataFetchStatus::NoMatch
	} else {
		MetadataFetchStatus::AwaitingReview
	};

	let candidates_json = serde_json::to_value(&all_candidates)
		.map_err(|e| CoreError::InternalError(e.to_string()))?;

	let active_model = metadata_fetch_record::ActiveModel {
		series_id: Set(Some(series_id.to_string())),
		status: Set(status),
		match_candidates: Set(Some(candidates_json)),
		..Default::default()
	};

	metadata_fetch_record::Entity::insert(active_model)
		.on_conflict(
			OnConflict::column(metadata_fetch_record::Column::SeriesId)
				.update_columns([
					metadata_fetch_record::Column::Status,
					metadata_fetch_record::Column::MatchCandidates,
					metadata_fetch_record::Column::UpdatedAt,
				])
				.to_owned(),
		)
		.exec(conn)
		.await?;

	if let Some((candidate, config)) =
		apply::find_auto_apply_candidate(&all_candidates, &provider_configs)
	{
		tracing::info!(
			series_id,
			provider = candidate.provider,
			confidence = candidate.confidence,
			"Auto-applying series metadata match"
		);
		if let Err(e) = apply::apply_series_match(
			conn,
			series_id,
			&candidate,
			config.strategy,
			config.exclude_fields,
			vec![],
		)
		.await
		{
			tracing::error!(
				series_id,
				error = ?e,
				"Failed to auto-apply series metadata"
			);
		}
	}

	Ok(all_candidates)
}

/// Fetch metadata candidates for a media item from all enabled providers
pub async fn fetch_media_metadata(
	conn: &DatabaseConnection,
	media_id: &str,
	search: SearchQuery,
	provider_cache: &ProviderClientCache,
) -> Result<Vec<MatchCandidate>, CoreError> {
	let provider_configs = metadata_provider_config::Entity::find()
		.filter(metadata_provider_config::Column::Enabled.eq(true))
		.all(conn)
		.await?;

	if provider_configs.is_empty() {
		return Err(CoreError::InternalError(
			"No enabled metadata providers configured".to_string(),
		));
	}

	let mut all_candidates: Vec<MatchCandidate> = Vec::new();

	for config in &provider_configs {
		match provider_cache.get_or_create(config).await {
			Ok(provider) => match provider.search_media(&search).await {
				Ok(candidates) => {
					all_candidates.extend(candidates);
				},
				Err(e) => {
					tracing::error!(
						provider = ?config.provider_type,
						error = ?e,
						"Failed to search provider for media metadata"
					);
				},
			},
			Err(e) => {
				tracing::error!(
					provider = ?config.provider_type,
					error = ?e,
					"Failed to get provider client"
				);
			},
		}
	}

	let status = if all_candidates.is_empty() {
		MetadataFetchStatus::NoMatch
	} else {
		MetadataFetchStatus::AwaitingReview
	};

	let candidates_json = serde_json::to_value(&all_candidates)
		.map_err(|e| CoreError::InternalError(e.to_string()))?;

	let active_model = metadata_fetch_record::ActiveModel {
		media_id: Set(Some(media_id.to_string())),
		status: Set(status),
		match_candidates: Set(Some(candidates_json)),
		..Default::default()
	};

	metadata_fetch_record::Entity::insert(active_model)
		.on_conflict(
			OnConflict::column(metadata_fetch_record::Column::MediaId)
				.update_columns([
					metadata_fetch_record::Column::Status,
					metadata_fetch_record::Column::MatchCandidates,
					metadata_fetch_record::Column::UpdatedAt,
				])
				.to_owned(),
		)
		.exec(conn)
		.await?;

	if let Some((candidate, config)) =
		apply::find_auto_apply_candidate(&all_candidates, &provider_configs)
	{
		tracing::info!(
			media_id,
			provider = candidate.provider,
			confidence = candidate.confidence,
			"Auto-applying media metadata match"
		);
		if let Err(e) = apply::apply_media_match(
			conn,
			media_id,
			&candidate,
			config.strategy,
			config.exclude_fields,
			vec![],
		)
		.await
		{
			tracing::error!(
				media_id,
				error = ?e,
				"Failed to auto-apply media metadata"
			);
		}
	}

	Ok(all_candidates)
}
