use metadata_integrations::{
	AutoApplyConfig, ExternalMediaMetadata, ExternalMetadata, ExternalSeriesMetadata,
	FieldMerger, MatchCandidate, MergeStrategy, MetadataField, MetadataFieldOverride,
};
use models::{
	entity::{media_metadata, metadata_fetch_record, series_metadata},
	shared::enums::MetadataFetchStatus,
};
use rust_decimal::prelude::FromPrimitive;
use sea_orm::{prelude::*, IntoActiveModel, Set};
use serde_json::Value as JsonValue;

use crate::CoreError;

/// Apply the given match candidate to series metadata, merging fields
/// according to the provided strategy and locked fields
pub async fn apply_series_match<C>(
	conn: &C,
	series_id: &str,
	candidate: &MatchCandidate,
	strategy: MergeStrategy,
	exclude_fields: Vec<MetadataField>,
	overrides: Vec<MetadataFieldOverride>,
) -> Result<(), CoreError>
where
	C: ConnectionTrait,
{
	let ext = match &candidate.metadata {
		ExternalMetadata::Series(s) => s,
		_ => {
			return Err(CoreError::InternalError(format!(
				"Candidate metadata is not series type for series {}",
				series_id
			)));
		},
	};

	let existing = series_metadata::Entity::find_by_id(series_id)
		.one(conn)
		.await?;

	match existing {
		Some(model) => {
			let merger = FieldMerger::with_overrides(
				strategy,
				parse_locked_fields(&model.locked_fields),
				exclude_fields,
				overrides,
			);

			let mut active = model.clone().into_active_model();
			active.metadata_source = Set(Some(candidate.provider.clone()));
			active.metadata_external_id = Set(Some(candidate.external_id.clone()));

			apply_series_fields(&merger, &model, &mut active, ext);

			series_metadata::Entity::update(active).exec(conn).await?;
		},
		None => {
			let active = build_series_metadata_insert(
				series_id,
				ext,
				&candidate.provider,
				&candidate.external_id,
			);
			series_metadata::Entity::insert(active).exec(conn).await?;
		},
	}

	mark_fetch_status_accepted(conn, Some(series_id), None, candidate).await?;

	Ok(())
}

/// Apply the given match candidate to media metadata, merging fields
/// according to the provided strategy and locked fields
pub async fn apply_media_match<C>(
	conn: &C,
	media_id: &str,
	candidate: &MatchCandidate,
	strategy: MergeStrategy,
	exclude_fields: Vec<MetadataField>,
	overrides: Vec<MetadataFieldOverride>,
) -> Result<(), CoreError>
where
	C: ConnectionTrait,
{
	let ext = match &candidate.metadata {
		ExternalMetadata::Media(m) => m,
		_ => {
			return Err(CoreError::InternalError(format!(
				"Candidate metadata is not media type for media {}",
				media_id
			)));
		},
	};

	let existing = media_metadata::Entity::find()
		.filter(media_metadata::Column::MediaId.eq(media_id))
		.one(conn)
		.await?;

	match existing {
		Some(model) => {
			let merger = FieldMerger::with_overrides(
				strategy,
				parse_locked_fields(&model.locked_fields),
				exclude_fields,
				overrides,
			);

			let mut active = model.clone().into_active_model();
			active.metadata_source = Set(Some(candidate.provider.clone()));
			active.metadata_external_id = Set(Some(candidate.external_id.clone()));

			apply_media_fields(&merger, &model, &mut active, ext);

			media_metadata::Entity::update(active).exec(conn).await?;
		},
		None => {
			let active = build_media_metadata_insert(
				media_id,
				ext,
				&candidate.provider,
				&candidate.external_id,
			);
			media_metadata::Entity::insert(active).exec(conn).await?;
		},
	}

	mark_fetch_status_accepted(conn, None, Some(media_id), candidate).await?;

	Ok(())
}

/// Given a list of candidates and a set of provider configs, find the best
/// candidate whose provider has auto-apply enabled and whose confidence meets
/// the threshold.
///
/// Note: A provider _should_ sort the candidates already, so this function takes that
/// assumption and does not sort
pub fn find_auto_apply_candidate(
	candidates: &[MatchCandidate],
	provider_configs: &[models::entity::metadata_provider_config::Model],
) -> Option<(MatchCandidate, AutoApplyConfig)> {
	for candidate in candidates {
		if let Some(config) = provider_configs
			.iter()
			.find(|c| c.provider_type.to_string() == candidate.provider)
		{
			if let Some(auto_config) = config
				.auto_apply_config
				.as_ref()
				.and_then(|v| serde_json::from_value::<AutoApplyConfig>(v.clone()).ok())
			{
				let confidence =
					Decimal::from_f32(candidate.confidence).unwrap_or(Decimal::ZERO);

				if auto_config.enabled && confidence >= auto_config.threshold {
					return Some((candidate.clone(), auto_config));
				}
			}
		}
	}

	None
}

fn parse_locked_fields(json: &Option<JsonValue>) -> Vec<MetadataField> {
	json.as_ref()
		.and_then(|v| serde_json::from_value(v.clone()).ok())
		.unwrap_or_default()
}

async fn mark_fetch_status_accepted<C>(
	conn: &C,
	series_id: Option<&str>,
	media_id: Option<&str>,
	candidate: &MatchCandidate,
) -> Result<(), CoreError>
where
	C: ConnectionTrait,
{
	let candidate_json = serde_json::to_value(candidate)
		.map_err(|e| CoreError::InternalError(e.to_string()))?;

	let mut query = metadata_fetch_record::Entity::find();
	if let Some(sid) = series_id {
		query = query.filter(metadata_fetch_record::Column::SeriesId.eq(sid));
	}
	if let Some(mid) = media_id {
		query = query.filter(metadata_fetch_record::Column::MediaId.eq(mid));
	}

	// Note: This realistically shouldn't happen but is more of a safeguard
	if let Some(status) = query.one(conn).await? {
		tracing::warn!(
			?series_id,
			?media_id,
			?candidate,
			"Unable to fetch the original fetch record!"
		);
		let mut active: metadata_fetch_record::ActiveModel = status.into();
		active.status = Set(MetadataFetchStatus::Fetched);
		active.accepted_match_candidate = Set(Some(candidate_json));
		metadata_fetch_record::Entity::update(active)
			.exec(conn)
			.await?;
	}

	Ok(())
}

fn apply_series_fields(
	merger: &FieldMerger,
	model: &series_metadata::Model,
	active: &mut series_metadata::ActiveModel,
	ext: &ExternalSeriesMetadata,
) {
	if let Some(v) =
		merger.merge_scalar(MetadataField::Title, &model.title, &Some(ext.title.clone()))
	{
		active.title = Set(v);
	}

	if let Some(v) =
		merger.merge_scalar(MetadataField::Summary, &model.summary, &ext.summary)
	{
		active.summary = Set(v);
	}

	if let Some(v) =
		merger.merge_scalar(MetadataField::Publisher, &model.publisher, &ext.publisher)
	{
		active.publisher = Set(v);
	}

	if let Some(v) = merger.merge_scalar(MetadataField::Year, &model.year, &ext.year) {
		active.year = Set(v);
	}

	let ext_age_rating = ext.age_rating.as_ref().and_then(|s| s.parse::<i32>().ok());
	if let Some(v) =
		merger.merge_scalar(MetadataField::AgeRating, &model.age_rating, &ext_age_rating)
	{
		active.age_rating = Set(v);
	}

	let ext_status = ext.status.as_ref().map(|s| format!("{:?}", s));
	if let Some(v) =
		merger.merge_scalar(MetadataField::Status, &model.status, &ext_status)
	{
		active.status = Set(v);
	}

	if let Some(v) = merger.merge_scalar(
		MetadataField::VolumeCount,
		&model.total_issues,
		&ext.volume_count,
	) {
		active.total_issues = Set(v);
	}

	if let Some(v) =
		merger.merge_comma_list(MetadataField::Genres, &model.genres, &ext.genres)
	{
		active.genres = Set(v);
	}

	if let Some(v) =
		merger.merge_comma_list(MetadataField::Writers, &model.writers, &ext.authors)
	{
		active.writers = Set(v);
	}

	if let Some(v) = merger.apply_scalar_override::<String>(MetadataField::Title) {
		active.title = Set(v);
	}
	if let Some(v) = merger.apply_scalar_override::<String>(MetadataField::Summary) {
		active.summary = Set(v);
	}
	if let Some(v) = merger.apply_scalar_override::<String>(MetadataField::Publisher) {
		active.publisher = Set(v);
	}
	if let Some(v) = merger.apply_scalar_override::<i32>(MetadataField::Year) {
		active.year = Set(v);
	}
	if let Some(v) = merger.apply_scalar_override::<i32>(MetadataField::AgeRating) {
		active.age_rating = Set(v);
	}
	if let Some(v) = merger.apply_scalar_override::<String>(MetadataField::Status) {
		active.status = Set(v);
	}
	if let Some(v) = merger.apply_scalar_override::<i32>(MetadataField::VolumeCount) {
		active.total_issues = Set(v);
	}
	if let Some(v) = merger.apply_comma_list_override(MetadataField::Genres) {
		active.genres = Set(v);
	}
	if let Some(v) = merger.apply_comma_list_override(MetadataField::Writers) {
		active.writers = Set(v);
	}
}

fn apply_media_fields(
	merger: &FieldMerger,
	model: &media_metadata::Model,
	active: &mut media_metadata::ActiveModel,
	ext: &ExternalMediaMetadata,
) {
	if let Some(v) = merger.merge_scalar(MetadataField::Title, &model.title, &ext.title) {
		active.title = Set(v);
	}

	if let Some(v) =
		merger.merge_scalar(MetadataField::Summary, &model.summary, &ext.summary)
	{
		active.summary = Set(v);
	}

	if let Some(v) = merger.merge_scalar(MetadataField::Year, &model.year, &ext.year) {
		active.year = Set(v);
	}

	if let Some(v) =
		merger.merge_scalar(MetadataField::PageCount, &model.page_count, &ext.page_count)
	{
		active.page_count = Set(v);
	}

	if let Some(v) = merger.merge_scalar(MetadataField::ReleaseDate, &model.day, &ext.day)
	{
		active.day = Set(v);
	}

	if let Some(v) =
		merger.merge_scalar(MetadataField::ReleaseDate, &model.month, &ext.month)
	{
		active.month = Set(v);
	}

	let ext_isbn = ext.isbn.as_ref().or(ext.isbn_13.as_ref()).cloned();
	if let Some(v) =
		merger.merge_scalar(MetadataField::Isbn, &model.identifier_isbn, &ext_isbn)
	{
		active.identifier_isbn = Set(v);
	}

	if let Some(v) =
		merger.merge_comma_list(MetadataField::Genres, &model.genres, &ext.genres)
	{
		active.genres = Set(v);
	}

	if let Some(v) =
		merger.merge_comma_list(MetadataField::Writers, &model.writers, &ext.writers)
	{
		active.writers = Set(v);
	}

	if let Some(v) = merger.merge_comma_list(
		MetadataField::Colorists,
		&model.colorists,
		&ext.colorists,
	) {
		active.colorists = Set(v);
	}

	if let Some(v) = merger.merge_comma_list(
		MetadataField::Letterers,
		&model.letterers,
		&ext.letterers,
	) {
		active.letterers = Set(v);
	}

	if let Some(v) = merger.merge_comma_list(
		MetadataField::CoverArtists,
		&model.cover_artists,
		&ext.cover_artists,
	) {
		active.cover_artists = Set(v);
	}

	if let Some(v) =
		merger.merge_comma_list(MetadataField::Artists, &model.pencillers, &ext.artists)
	{
		active.pencillers = Set(v);
	}

	if let Some(v) = merger.apply_scalar_override::<String>(MetadataField::Title) {
		active.title = Set(v);
	}
	if let Some(v) = merger.apply_scalar_override::<String>(MetadataField::Summary) {
		active.summary = Set(v);
	}
	if let Some(v) = merger.apply_scalar_override::<i32>(MetadataField::Year) {
		active.year = Set(v);
	}
	if let Some(v) = merger.apply_scalar_override::<i32>(MetadataField::PageCount) {
		active.page_count = Set(v);
	}
	// TODO: Sort this one out
	// if let Some(v) = merger.apply_scalar_override::<i32>(MetadataField::ReleaseDate) {
	// 	active.day = Set(v);
	// }
	if let Some(v) = merger.apply_scalar_override::<String>(MetadataField::Isbn) {
		active.identifier_isbn = Set(v);
	}
	if let Some(v) = merger.apply_comma_list_override(MetadataField::Genres) {
		active.genres = Set(v);
	}
	if let Some(v) = merger.apply_comma_list_override(MetadataField::Writers) {
		active.writers = Set(v);
	}
	if let Some(v) = merger.apply_comma_list_override(MetadataField::Colorists) {
		active.colorists = Set(v);
	}
	if let Some(v) = merger.apply_comma_list_override(MetadataField::Letterers) {
		active.letterers = Set(v);
	}
	if let Some(v) = merger.apply_comma_list_override(MetadataField::CoverArtists) {
		active.cover_artists = Set(v);
	}
	if let Some(v) = merger.apply_comma_list_override(MetadataField::Artists) {
		active.pencillers = Set(v);
	}
}

fn build_series_metadata_insert(
	series_id: &str,
	ext: &ExternalSeriesMetadata,
	provider: &str,
	external_id: &str,
) -> series_metadata::ActiveModel {
	let ext_age_rating = ext.age_rating.as_ref().and_then(|s| s.parse::<i32>().ok());
	let ext_status = ext.status.as_ref().map(|s| format!("{:?}", s));

	series_metadata::ActiveModel {
		series_id: Set(series_id.to_string()),
		title: Set(Some(ext.title.clone())),
		summary: Set(ext.summary.clone()),
		publisher: Set(ext.publisher.clone()),
		year: Set(ext.year),
		age_rating: Set(ext_age_rating),
		status: Set(ext_status),
		total_issues: Set(ext.volume_count),
		genres: Set(ext.genres.as_ref().map(|g| g.join(", "))),
		writers: Set(ext.authors.as_ref().map(|a| a.join(", "))),
		metadata_source: Set(Some(provider.to_string())),
		metadata_external_id: Set(Some(external_id.to_string())),
		..Default::default()
	}
}

fn build_media_metadata_insert(
	media_id: &str,
	ext: &ExternalMediaMetadata,
	provider: &str,
	external_id: &str,
) -> media_metadata::ActiveModel {
	let ext_isbn = ext.isbn.as_ref().or(ext.isbn_13.as_ref()).cloned();

	media_metadata::ActiveModel {
		media_id: Set(Some(media_id.to_string())),
		title: Set(ext.title.clone()),
		summary: Set(ext.summary.clone()),
		year: Set(ext.year),
		day: Set(ext.day),
		month: Set(ext.month),
		page_count: Set(ext.page_count),
		identifier_isbn: Set(ext_isbn),
		genres: Set(ext.genres.as_ref().map(|g| g.join(", "))),
		writers: Set(ext.writers.as_ref().map(|w| w.join(", "))),
		colorists: Set(ext.colorists.as_ref().map(|c| c.join(", "))),
		letterers: Set(ext.letterers.as_ref().map(|l| l.join(", "))),
		cover_artists: Set(ext.cover_artists.as_ref().map(|c| c.join(", "))),
		pencillers: Set(ext.artists.as_ref().map(|a| a.join(", "))),
		metadata_source: Set(Some(provider.to_string())),
		metadata_external_id: Set(Some(external_id.to_string())),
		..Default::default()
	}
}
