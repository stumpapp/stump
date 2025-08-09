use std::{thread, time::Duration};

use clap::Subcommand;
use dialoguer::{theme::ColorfulTheme, Confirm, Input, Password};
use models::entity::{session, user};
use sea_orm::{prelude::*, ActiveValue::Set, IntoActiveModel, QueryTrait};
use stump_core::{config::StumpConfig, database::connect};

use crate::{error::CliResult, CliError};

use super::default_progress_spinner;

/// Subcommands for interacting with Stump accounts
#[derive(Subcommand, Debug)]
pub enum Account {
	/// Lock an account, preventing any further logins until unlocked
	Lock {
		/// The username of the account to lock
		#[clap(long)]
		username: String,
	},
	/// Unlock an account, allowing logins again
	Unlock {
		/// The username of the account to unlock
		#[clap(long)]
		username: String,
	},
	/// List all accounts, optionally filtering by locked status
	List {
		/// Only list locked accounts
		#[clap(long)]
		locked: Option<bool>,
	},
	/// Reset the password for an account
	ResetPassword {
		/// The username of the account to reset the password for
		#[clap(long)]
		username: String,
	},
	/// Enter a flow to change the server owner to another account
	ResetOwner,
}

pub async fn handle_account_command(
	command: Account,
	config: &StumpConfig,
) -> CliResult<()> {
	match command {
		Account::Lock { username } => {
			set_account_lock_status(username, true, config).await
		},
		Account::Unlock { username } => {
			set_account_lock_status(username, false, config).await
		},
		Account::List { locked } => print_accounts(locked, config).await,
		Account::ResetPassword { username } => {
			reset_account_password(username, config.password_hash_cost, config).await
		},
		Account::ResetOwner => change_server_owner(config).await,
	}
}

async fn set_account_lock_status(
	username: String,
	lock: bool,
	config: &StumpConfig,
) -> CliResult<()> {
	let progress = default_progress_spinner();
	progress.set_message(if lock {
		"Locking account..."
	} else {
		"Unlocking account..."
	});

	let conn = connect(config).await?;

	let user = user::Entity::find()
		.filter(user::Column::Username.eq(username.clone()))
		.one(&conn)
		.await?
		.ok_or_else(|| {
			progress.abandon_with_message("No account with that username was found");
			CliError::OperationFailed(String::from(
				"No account with that username was found",
			))
		})?;

	let mut active_model = user.into_active_model();
	active_model.is_locked = Set(lock);
	let updated_user = active_model.update(&conn).await?;

	if lock {
		progress.set_message("Removing active login sessions...");

		let delete_sessions = session::Entity::delete_many()
			.filter(session::Column::UserId.eq(updated_user.id.clone()))
			.exec(&conn)
			.await?
			.rows_affected;

		progress.set_message(format!("Removed {} active session(s)", delete_sessions));
	}

	thread::sleep(Duration::from_millis(500));

	progress.finish_with_message(if lock {
		"Account locked successfully!"
	} else {
		"Account unlocked successfully!"
	});
	Ok(())
}

async fn reset_account_password(
	username: String,
	hash_cost: u32,
	config: &StumpConfig,
) -> CliResult<()> {
	let conn = connect(config).await?;

	let theme = &ColorfulTheme::default();
	let builder = Password::with_theme(theme)
		.with_prompt("Enter a new password")
		.with_confirmation("Confirm password", "Passwords don't match!");
	let password = builder.interact()?;

	let progress = default_progress_spinner();
	progress.set_message("Hashing and salting password...");
	let hashed_password =
		bcrypt::hash(password, hash_cost).expect("Failed to hash password");

	progress.set_message("Updating account...");

	let user = user::Entity::find()
		.filter(user::Column::Username.eq(username.clone()))
		.one(&conn)
		.await?
		.ok_or_else(|| {
			progress.abandon_with_message("No account with that username was found");
			CliError::OperationFailed(String::from(
				"No account with that username was found",
			))
		})?;

	let mut active_model = user.into_active_model();
	active_model.hashed_password = Set(hashed_password);

	let _updated_user = active_model.update(&conn).await?;

	thread::sleep(Duration::from_millis(500));

	progress.finish_with_message("Account password updated successfully!");
	Ok(())
}

async fn print_accounts(locked: Option<bool>, config: &StumpConfig) -> CliResult<()> {
	let progress = default_progress_spinner();
	progress.set_message("Fetching accounts...");

	let conn = connect(config).await?;

	let users = models::entity::user::Entity::find()
		.apply_if(locked, |query, locked| {
			query.filter(user::Column::IsLocked.eq(locked))
		})
		.all(&conn)
		.await?;

	if users.is_empty() {
		progress.finish_with_message("No accounts found.");
	} else {
		progress.finish_with_message("Accounts fetched successfully!");

		let mut table = prettytable::Table::new();
		table.add_row(prettytable::row!["Account", "Status"]);

		for user in users {
			table.add_row(prettytable::row![
				user.username,
				if user.is_locked { "locked" } else { "unlocked" }
			]);
		}

		table.printstd();
	}

	Ok(())
}

async fn change_server_owner(config: &StumpConfig) -> CliResult<()> {
	let conn = connect(config).await?;

	let all_accounts = models::entity::user::Entity::find()
		.filter(user::Column::IsLocked.eq(false))
		.all(&conn)
		.await?;

	let current_server_owner = all_accounts
		.iter()
		.find(|user| user.is_server_owner)
		.cloned();

	let username = Input::new()
		.with_prompt("Enter the username of the account to assign as server owner")
		.allow_empty(false)
		.validate_with(|input: &String| -> Result<(), &str> {
			let existing_user = all_accounts.iter().find(|user| user.username == *input);
			if existing_user.is_some() {
				Ok(())
			} else {
				Err("An account with that username does not exist or their account is locked")
			}
		})
		.interact_text()?;

	let confirmation = Confirm::new()
		.with_prompt("Are you sure you want to continue?")
		.interact()?;

	if !confirmation {
		println!("Exiting...");
		return Ok(());
	}

	let target_user = all_accounts
		.into_iter()
		.find(|user| user.username == username)
		.ok_or(CliError::OperationFailed(
			"Failed to reconcile users after validation".to_string(),
		))?;

	let progress = default_progress_spinner();
	if let Some(user) = current_server_owner {
		progress.set_message(format!("Removing owner status from {}", user.username));
		let mut active_model = user.into_active_model();
		active_model.is_server_owner = Set(false);
		let updated_user = active_model.update(&conn).await?;

		session::Entity::delete_many()
			.filter(session::Column::UserId.eq(updated_user.id))
			.exec(&conn)
			.await?;
	}

	progress.set_message(format!("Setting owner status for {}", target_user.username));
	let mut active_model = target_user.into_active_model();
	active_model.is_server_owner = Set(true);
	let _updated_user = active_model.update(&conn).await?;
	session::Entity::delete_many()
		.filter(session::Column::UserId.eq(_updated_user.id))
		.exec(&conn)
		.await?;
	progress.finish_with_message("Successfully changed the server owner!");

	Ok(())
}
