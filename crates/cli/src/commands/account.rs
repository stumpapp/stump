use std::{thread, time::Duration};

use clap::Subcommand;
use dialoguer::{theme::ColorfulTheme, Confirm, Input, Password};
use stump_core::{
	db::create_client,
	prisma::{session, user},
};

use crate::{commands::chain_optional_iter, error::CliResult, CliConfig, CliError};

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
	config: CliConfig,
) -> CliResult<()> {
	match command {
		Account::Lock { username } => set_account_lock_status(username, true).await,
		Account::Unlock { username } => set_account_lock_status(username, false).await,
		Account::List { locked } => print_accounts(locked).await,
		Account::ResetPassword { username } => {
			reset_account_password(username, config.password_hash_cost).await
		},
		Account::ResetOwner => change_server_owner().await,
	}
}

async fn set_account_lock_status(username: String, lock: bool) -> CliResult<()> {
	let progress = default_progress_spinner();
	progress.set_message(if lock {
		"Locking account..."
	} else {
		"Unlocking account..."
	});

	let client = create_client().await;

	let affected_rows = client
		.user()
		.update_many(
			vec![user::username::equals(username.clone())],
			vec![user::is_locked::set(lock)],
		)
		.exec()
		.await?;

	if lock {
		progress.set_message("Removing active login sessions...");
		client
			.session()
			.delete_many(vec![session::user::is(vec![user::username::equals(
				username,
			)])])
			.exec()
			.await?;
	}

	thread::sleep(Duration::from_millis(500));

	if affected_rows == 0 {
		progress.abandon_with_message("No account with that username was found");
		Err(CliError::OperationFailed(String::from(
			"No account with that username was found",
		)))
	} else {
		progress.finish_with_message(if lock {
			"Account locked successfully!"
		} else {
			"Account unlocked successfully!"
		});
		Ok(())
	}
}

async fn reset_account_password(username: String, hash_cost: u32) -> CliResult<()> {
	let client = create_client().await;

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

	let affected_rows = client
		.user()
		.update_many(
			vec![user::username::equals(username)],
			vec![user::hashed_password::set(hashed_password)],
		)
		.exec()
		.await?;

	thread::sleep(Duration::from_millis(500));

	if affected_rows == 0 {
		progress.abandon_with_message("No account with that username was found");
		Err(CliError::OperationFailed(String::from(
			"No account with that username was found",
		)))
	} else {
		progress.finish_with_message("Account password updated successfully!");
		Ok(())
	}
}

// TODO: print pretty table
// TODO: handle empty state
async fn print_accounts(locked: Option<bool>) -> CliResult<()> {
	let progress = default_progress_spinner();
	progress.set_message("Fetching accounts...");

	let client = create_client().await;

	let users = client
		.user()
		.find_many(chain_optional_iter(
			[],
			[locked.map(user::is_locked::equals)],
		))
		.exec()
		.await?;

	progress.finish_with_message("Accounts fetched successfully!");

	for user in users {
		println!(
			"{}: {}",
			user.username,
			if user.is_locked { "locked" } else { "unlocked" }
		);
	}

	Ok(())
}

async fn change_server_owner() -> CliResult<()> {
	let client = create_client().await;

	let all_accounts = client
		.user()
		.find_many(vec![user::is_locked::equals(false)])
		.exec()
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
		client
			.user()
			.update(
				user::id::equals(user.id.clone()),
				vec![user::is_server_owner::set(false)],
			)
			.exec()
			.await?;
		client
			.session()
			.delete_many(vec![session::user_id::equals(user.id)])
			.exec()
			.await?;
	}

	progress.set_message(format!("Setting owner status for {}", target_user.username));
	client
		.user()
		.update(
			user::id::equals(target_user.id.clone()),
			vec![user::is_server_owner::set(true)],
		)
		.exec()
		.await?;
	client
		.session()
		.delete_many(vec![session::user_id::equals(target_user.id)])
		.exec()
		.await?;

	progress.finish_with_message("Successfully changed the server owner!");

	Ok(())
}
