use metadata_integrations::{MatchCandidate, SearchQuery};
use models::{
	entity::{
		library_config, media, metadata_fetch_record, metadata_provider_config, series,
	},
	shared::enums::{LibraryType, MetadataFetchStatus},
};
use sea_orm::{prelude::*, sea_query::OnConflict, QuerySelect, Set};

use super::{apply, ProviderClientCache};
use crate::CoreError;

async fn library_type_for_series(
	conn: &DatabaseConnection,
	series_id: &str,
) -> Result<LibraryType, CoreError> {
	let library_id = series::Entity::find_by_id(series_id)
		.select_only()
		.column(series::Column::LibraryId)
		.into_tuple::<String>()
		.one(conn)
		.await?
		.ok_or_else(|| CoreError::NotFound(format!("Series {series_id}")))?;

	let config = library_config::Entity::find()
		.filter(library_config::Column::LibraryId.eq(library_id))
		.one(conn)
		.await
		.map_err(|e| CoreError::InternalError(e.to_string()))?
		.ok_or_else(|| CoreError::NotFound("Library missing config!".into()))?;

	Ok(config.library_type)
}

// TODO: This is terrible, I should just bite the bullet and put a direct fk on media
async fn library_type_for_media(
	conn: &DatabaseConnection,
	media_id: &str,
) -> Result<LibraryType, CoreError> {
	let tuple = media::Entity::find()
		.filter(media::Column::Id.eq(media_id))
		.find_also_related(series::Entity)
		.one(conn)
		.await?
		.ok_or_else(|| CoreError::NotFound(format!("Media {media_id}")))?;

	let (_, Some(series)) = tuple else {
		return Err(CoreError::NotFound(format!("Series for media {media_id}")));
	};

	library_type_for_series(conn, &series.id).await
}

fn filter_providers_for_library_type(
	provider_configs: Vec<metadata_provider_config::Model>,
	library_type: &LibraryType,
) -> Vec<metadata_provider_config::Model> {
	provider_configs
		.into_iter()
		.filter(|c| library_type.has_provider_overlap(&c.provider_type))
		.collect()
}

/// Fetch metadata candidates for a series from all enabled providers
pub async fn fetch_series_metadata(
	conn: &DatabaseConnection,
	series_id: &str,
	series_name: &str,
	provider_cache: &ProviderClientCache,
) -> Result<Vec<MatchCandidate>, CoreError> {
	let library_type = library_type_for_series(conn, series_id).await?;

	let provider_configs = metadata_provider_config::Entity::find()
		.filter(metadata_provider_config::Column::Enabled.eq(true))
		.all(conn)
		.await?;

	let provider_configs =
		filter_providers_for_library_type(provider_configs, &library_type);

	if provider_configs.is_empty() {
		return Err(CoreError::InternalError(
			"No enabled metadata providers configured for this library type".to_string(),
		));
	}

	let mut all_candidates: Vec<MatchCandidate> = Vec::new();
	let mut was_rate_limited = false;

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
					Err(e) if e.is_rate_limited() => {
						was_rate_limited = true;
						tracing::warn!(
							provider = ?config.provider_type,
							"Rate limited after retries for series metadata"
						);
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

	let status = if was_rate_limited && all_candidates.is_empty() {
		MetadataFetchStatus::RateLimited
	} else if all_candidates.is_empty() {
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
	let library_type = library_type_for_media(conn, media_id).await?;

	let provider_configs = metadata_provider_config::Entity::find()
		.filter(metadata_provider_config::Column::Enabled.eq(true))
		.all(conn)
		.await?;

	let provider_configs =
		filter_providers_for_library_type(provider_configs, &library_type);

	if provider_configs.is_empty() {
		return Err(CoreError::InternalError(
			"No enabled metadata providers configured for this library type".to_string(),
		));
	}

	let mut all_candidates: Vec<MatchCandidate> = Vec::new();
	let mut was_rate_limited = false;

	for config in &provider_configs {
		match provider_cache.get_or_create(config).await {
			Ok(provider) => match provider.search_media(&search).await {
				Ok(candidates) => {
					all_candidates.extend(candidates);
				},
				Err(e) if e.is_rate_limited() => {
					was_rate_limited = true;
					tracing::warn!(
						provider = ?config.provider_type,
						"Rate limited after retries for media metadata"
					);
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

	let status = if was_rate_limited && all_candidates.is_empty() {
		MetadataFetchStatus::RateLimited
	} else if all_candidates.is_empty() {
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
