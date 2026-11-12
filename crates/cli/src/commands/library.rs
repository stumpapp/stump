use std::collections::HashMap;

use clap::Subcommand;
use dialoguer::{theme::ColorfulTheme, Confirm, MultiSelect, Select};
use models::{
	entity::{library, library_access, user},
	services::oidc_sync::sync_oidc_library_access_for_library,
};
use sea_orm::{prelude::*, ActiveModelTrait, ActiveValue::Set, TransactionTrait};
use stump_core::{config::StumpConfig, database::connect};

use crate::{commands::default_progress_spinner, error::CliResult, CliError};

#[derive(clap::Args, Debug)]
pub struct LibraryByIdOrAsk {
	/// The library ID
	#[clap(long)]
	library_id: Option<String>,
}

/// Subcommands for interacting with the library operations
#[derive(Subcommand, Debug)]
pub enum LibraryCommand {
	ChangeAccess(LibraryByIdOrAsk),
}

pub async fn handle_library_command(
	command: LibraryCommand,
	config: &StumpConfig,
) -> CliResult<()> {
	match command {
		LibraryCommand::ChangeAccess(params) => change_access(params, config).await,
	}
}

async fn ask_for_library(conn: &DatabaseConnection) -> CliResult<String> {
	let libraries = library::Entity::find().all(conn).await?;

	if libraries.is_empty() {
		return Err(CliError::OperationFailed("No libraries exist".to_string()));
	}

	let selection = Select::with_theme(&ColorfulTheme::default())
		.with_prompt("Select a library")
		.items(
			&libraries
				.iter()
				.map(|library| library.name.clone())
				.collect::<Vec<String>>(),
		)
		.interact()?;

	Ok(libraries[selection].id.clone())
}

async fn change_oidc_groups(
	library: library::Model,
	conn: &impl ConnectionTrait,
) -> CliResult<()> {
	let current_oidc_groups = library.oidc_groups.clone().unwrap_or_default();

	let new_oidc_groups: String = dialoguer::Input::with_theme(&ColorfulTheme::default())
		.with_prompt(format!(
			"Enter new OIDC groups for library '{}' (comma-separated)",
			library.name
		))
		.default(current_oidc_groups.clone())
		.interact_text()?;

	let oidc_groups: Vec<String> = new_oidc_groups
		.split(',')
		.map(|g| g.trim().to_string())
		.filter(|g| !g.is_empty())
		.collect();

	let progress = default_progress_spinner();
	progress.set_message("Updating OIDC groups for library...");

	let mut library_model: library::ActiveModel = library.into();
	library_model.oidc_groups = Set(Some(oidc_groups.join(",")));
	let updated_library = library_model.update(conn).await?;

	progress.finish_with_message("OIDC groups updated successfully!");

	sync_oidc_library_access_for_library(conn, &updated_library.id, &oidc_groups).await?;

	Ok(())
}

async fn change_access(
	LibraryByIdOrAsk { library_id }: LibraryByIdOrAsk,
	config: &StumpConfig,
) -> CliResult<()> {
	let conn = connect(config).await?;

	let library_id = match library_id {
		Some(id) => id,
		None => ask_for_library(&conn).await?,
	};

	let Some(library) = library::Entity::find_by_id(library_id.clone())
		.one(&conn)
		.await?
	else {
		return Err(CliError::OperationFailed(
			"Library does not exist".to_string(),
		));
	};

	let is_oidc_enabled = config.oidc.as_ref().is_some_and(|config| config.enabled);
	let is_forced_oidc = is_oidc_enabled
		&& config
			.oidc
			.as_ref()
			.is_some_and(|config| config.disable_local_auth);

	let mut should_optionally_change_oidc_groups = false;
	// if enabled but not forced, means we could have non-oidc users and thus might need to change access for them
	// in addition to changing groups
	if is_oidc_enabled && !is_forced_oidc {
		let confirm = Confirm::with_theme(&ColorfulTheme::default())
			.with_prompt("OIDC is enabled but not enforced. Do you want to change OIDC group access for this library?")
			.interact()?;
		should_optionally_change_oidc_groups = confirm;
	}

	// forced is just always only changing groups
	if is_forced_oidc {
		let oidc_txn = conn.begin().await?;
		change_oidc_groups(library, &oidc_txn).await?;
		oidc_txn.commit().await?;
		return Ok(());
	} else if is_oidc_enabled && should_optionally_change_oidc_groups {
		let oidc_txn = conn.begin().await?;
		change_oidc_groups(library.clone(), &oidc_txn).await?;
		let confirm = Confirm::with_theme(&ColorfulTheme::default())
			.with_prompt(
				"Would you like to also manually change access for non-OIDC users?",
			)
			.interact()?;
		oidc_txn.commit().await?;
		if !confirm {
			println!("Exiting...");
			return Ok(());
		}
	}

	let users = user::Entity::find()
		.filter(user::Column::OidcIssuerId.is_null())
		.all(&conn)
		.await?;
	let user_username_to_id = users
		.iter()
		.map(|user| (user.username.clone(), user.id.clone()))
		.collect::<HashMap<String, String>>();

	let user_ids_with_access = library_access::Entity::find()
		.filter(library_access::Column::LibraryId.eq(library_id.clone()))
		.all(&conn)
		.await?
		.into_iter()
		.map(|access| access.user_id)
		.collect::<Vec<String>>();
	let user_id_to_can_access = users
		.iter()
		.map(|user| (user.id.clone(), user_ids_with_access.contains(&user.id)))
		.collect::<HashMap<String, bool>>();

	let selections = MultiSelect::with_theme(&ColorfulTheme::default())
		.with_prompt(format!(
			"Select users who should have access to {}",
			library.name
		))
		.items_checked(
			&users
				.iter()
				.map(|user| {
					(
						user.username.clone(),
						*user_id_to_can_access.get(&user.id).unwrap_or(&false),
					)
				})
				.collect::<Vec<(String, bool)>>(),
		)
		.interact()?;

	// selection is username, so we need to map back to user IDs
	let selected_user_ids = selections
		.into_iter()
		.map(|index| {
			let username = &users[index].username;
			user_username_to_id.get(username).unwrap().clone()
		})
		.collect::<Vec<String>>();

	let confirm = Confirm::with_theme(&ColorfulTheme::default())
		.with_prompt(format!(
			"Are you sure you want to change access for {}?",
			library.name
		))
		.interact()?;

	if !confirm {
		println!("Exiting...");
		return Ok(());
	}

	let progress = default_progress_spinner();
	progress.set_message("Updating access for library...");

	let txn = conn.begin().await?;

	// easier to just rm all access then re-add the selected ones
	let current_access = library_access::Entity::find()
		.filter(library_access::Column::LibraryId.eq(library_id.clone()))
		.all(&conn)
		.await?;
	for access in current_access {
		access.delete(&conn).await?;
	}

	for user_id in selected_user_ids {
		let new_access = library_access::ActiveModel {
			user_id: Set(user_id),
			library_id: Set(library_id.clone()),
			..Default::default()
		};
		new_access.insert(&conn).await?;
	}

	txn.commit().await?;

	progress.finish_with_message("Access updated successfully!");

	Ok(())
}
