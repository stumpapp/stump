use std::collections::{BTreeSet, HashMap, HashSet};

use chrono::Utc;
use clap::Subcommand;
use dialoguer::{Confirm, Select, theme::ColorfulTheme};
use models::{
	entity::{library, library_config, media, media_metadata, series},
	shared::enums::{FileStatus, OrganizationMode, SeriesKind},
};
use sea_orm::{
	ActiveValue::Set,
	ColumnTrait, DatabaseConnection, EntityTrait, IntoActiveModel, QueryFilter,
	QueryOrder, TransactionTrait,
	prelude::*,
	sea_query::{Expr, ExprTrait, OnConflict, Query},
};
use stump_core::{config::StumpConfig, database::connect};
use uuid::Uuid;

use crate::{CliError, error::CliResult};

use super::default_progress_spinner;

const MEDIA_UPDATE_BATCH_SIZE: usize = 500;

/// Commands for managing libraries
#[derive(Subcommand, Debug)]
pub enum Library {
	/// Convert a library to metadata-based organization
	ConvertToMetadata,
}

pub async fn handle_library_command(
	command: Library,
	config: &StumpConfig,
) -> CliResult<()> {
	match command {
		Library::ConvertToMetadata => convert_library(config).await,
	}
}

async fn convert_library(config: &StumpConfig) -> CliResult<()> {
	let conn = connect(config).await?;

	let libs_with_config = library::Entity::find()
		.find_also_related(library_config::Entity)
		.order_by_asc(library::Column::Name)
		.all(&conn)
		.await?;
	let libs_with_config = libs_with_config
		.into_iter()
		.filter_map(|(l, c)| c.map(|c| (l, c)))
		.collect::<Vec<_>>();

	if libs_with_config.is_empty() {
		return Ok(());
	}

	let items: Vec<_> = libs_with_config
		.iter()
		.map(|(library, _)| library.name.clone())
		.collect();

	let selection = Select::with_theme(&ColorfulTheme::default())
		.with_prompt("Select the library to convert")
		.items(&items)
		.default(0)
		.interact()?;

	let selected = &libs_with_config[selection].0;

	let confirmed = Confirm::with_theme(&ColorfulTheme::default())
		.with_prompt(format!(
			"Are you sure you want to convert '{}'? This cannot be undone",
			selected.name
		))
		.default(false)
		.interact()?;

	if !confirmed {
		return Ok(());
	}

	let progress = default_progress_spinner();
	progress.set_message(format!("Converting '{}'...", selected.name));

	let result = match convert_library_to_metadata(&conn, &selected.id).await {
		Ok(result) => result,
		Err(error) => {
			progress.abandon_with_message("Library conversion failed!");
			return Err(error);
		},
	};

	progress.finish_with_message(format!("Finished! {:?}", result));

	Ok(())
}

// don't rly care about dead code bc just used to print the output
#[allow(dead_code)]
#[derive(Debug, Default)]
struct ConversionResult {
	media_count: u64,
	media_with_series: u64,
	memberships_changed: u64,
	series_created: u64,
	series_deleted: u64,
}

async fn convert_library_to_metadata(
	conn: &DatabaseConnection,
	library_id: &str,
) -> CliResult<ConversionResult> {
	let txn = conn.begin().await?;

	let (library, library_config) = library::Entity::find_by_id(library_id)
		.find_also_related(library_config::Entity)
		.one(&txn)
		.await?
		.ok_or_else(|| CliError::OperationFailed("Library not found".to_string()))?;
	let config = library_config.ok_or_else(|| {
		CliError::OperationFailed("Library missing config??".to_string())
	})?;

	let books = media::Entity::find()
		.filter(media::Column::LibraryId.eq(library.id.clone()))
		.find_also_related(media_metadata::Entity)
		.all(&txn)
		.await?;

	let metadata_series_names: BTreeSet<String> = books
		.iter()
		.filter_map(|(_, metadata)| metadata.as_ref()?.series.as_deref())
		.map(str::trim)
		.filter(|name| !name.is_empty())
		.map(str::to_owned)
		.collect();

	let existing_virtual_series = series::Entity::find()
		.filter(series::Column::LibraryId.eq(library.id.clone()))
		.filter(series::Column::Kind.eq(SeriesKind::Virtual))
		.all(&txn)
		.await?;
	// ^ if used AS INTENDED, should be none, however jusssst in case i've tried to
	// handle reruns to a degree

	let existing_virtual_series: HashSet<_> = existing_virtual_series
		.iter()
		.map(|series| series.name.as_str())
		.collect();

	let series_names_to_create: Vec<_> = metadata_series_names
		.iter()
		.filter(|name| !existing_virtual_series.contains(name.as_str()))
		.cloned()
		.collect();

	let mut result = ConversionResult {
		media_count: books.len() as u64,
		..Default::default()
	};

	if !series_names_to_create.is_empty() {
		let now = Utc::now();
		let model_iter = series_names_to_create
			.iter()
			.map(|name| series::ActiveModel {
				id: Set(Uuid::new_v4().to_string()),
				name: Set(name.clone()),
				path: Set(None),
				kind: Set(SeriesKind::Virtual),
				library_id: Set(Some(library.id.clone())),
				status: Set(FileStatus::Ready),
				is_oneshot: Set(false),
				created_at: Set(now.into()),
				..Default::default()
			});
		result.series_created = series::Entity::insert_many(model_iter)
			.on_conflict(OnConflict::new().do_nothing().to_owned())
			// ^ precaution, don't think it would hit
			.exec_without_returning(&txn)
			.await?;
	}

	let names = metadata_series_names.into_iter().collect::<Vec<_>>();

	if !names.is_empty() {
		series::Entity::update_many()
			.filter(series::Column::LibraryId.eq(library.id.clone()))
			.filter(series::Column::Kind.eq(SeriesKind::Virtual))
			.filter(series::Column::Name.is_in(names.clone()))
			.col_expr(
				series::Column::DeletedAt,
				Expr::value(None::<DateTimeWithTimeZone>),
			)
			.col_expr(
				series::Column::Status,
				Expr::value(FileStatus::Ready.to_string()),
			)
			.exec(&txn)
			.await?;
	}

	let series_by_name: HashMap<_, _> = if names.is_empty() {
		HashMap::new()
	} else {
		series::Entity::find()
			.filter(series::Column::LibraryId.eq(library.id.clone()))
			.filter(series::Column::Kind.eq(SeriesKind::Virtual))
			.filter(series::Column::Name.is_in(names))
			.all(&txn)
			.await?
			.into_iter()
			.map(|series| (series.name, series.id))
			.collect()
	};

	let mut changed_media_by_series: HashMap<Option<String>, Vec<String>> =
		HashMap::new();

	for (book, metadata) in &books {
		let metadata_series = metadata
			.as_ref()
			.and_then(|metadata| metadata.series.as_deref())
			.map(str::trim)
			.filter(|name| !name.is_empty());

		let new_series_id = metadata_series.and_then(|n| series_by_name.get(n).cloned());

		if new_series_id.is_some() {
			result.media_with_series += 1;
		}

		if book.series_id != new_series_id {
			changed_media_by_series
				.entry(new_series_id)
				.or_default()
				.push(book.id.clone());
		}
	}

	let now = Utc::now();
	for (series_id, media_ids) in changed_media_by_series {
		for chunk in media_ids.chunks(MEDIA_UPDATE_BATCH_SIZE) {
			let updated = media::Entity::update_many()
				.filter(media::Column::LibraryId.eq(library.id.clone()))
				.filter(media::Column::Id.is_in(chunk.to_vec()))
				.col_expr(media::Column::SeriesId, Expr::value(series_id.clone()))
				.col_expr(
					media::Column::UpdatedAt,
					Expr::value::<DateTimeWithTimeZone>(now.into()),
					// ^ annoying
				)
				.exec(&txn)
				.await?;
			result.memberships_changed += updated.rows_affected;
		}
	}

	let has_media = Query::select()
		.expr(Expr::val(1))
		.from(media::Entity)
		.and_where(
			Expr::col((media::Entity, media::Column::SeriesId))
				.equals((series::Entity, series::Column::Id)),
		)
		.to_owned();

	result.series_deleted = series::Entity::delete_many()
		.filter(series::Column::LibraryId.eq(library.id.clone()))
		.filter(Expr::exists(has_media).not())
		.exec(&txn)
		.await?
		.rows_affected;

	let mut config = config.into_active_model();
	config.organization_mode = Set(OrganizationMode::Metadata);
	config.update(&txn).await?;

	txn.commit().await?;

	Ok(result)
}
