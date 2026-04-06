use std::{thread, time::Duration};

use clap::Subcommand;
use dialoguer::{theme::ColorfulTheme, Confirm, Input, Password};
use models::entity::{
	api_key, book_club_member, bookmark, favorite_library, favorite_media,
	favorite_series, finished_reading_session, last_library_visit, library_exclusion,
	media_annotation, reading_session, refresh_token, review, session, user,
	user_login_activity, user_preferences,
};
use sea_orm::{
	prelude::*, ActiveValue::Set, IntoActiveModel, QueryTrait, TransactionTrait,
};
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
	/// Migrate a local user account to an OIDC account
	MigrateOidc {
		/// The username of the local account to migrate
		#[clap(long)]
		username: String,
		/// The email of the OIDC account to migrate to
		#[clap(long)]
		oidc_email: String,
	},
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
		Account::MigrateOidc {
			username,
			oidc_email,
		} => migrate_oidc_account(config, username, oidc_email).await,
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

async fn migrate_oidc_account(
	config: &StumpConfig,
	username: String,
	oidc_email: String,
) -> CliResult<()> {
	let conn = connect(config).await?;

	let progress = default_progress_spinner();
	progress.set_message("Finding accounts...");

	// Find the local user (must not have oidc_issuer_id)
	let local_user = user::Entity::find()
		.filter(user::Column::Username.eq(username.clone()))
		.filter(user::Column::OidcIssuerId.is_null())
		.one(&conn)
		.await?
		.ok_or_else(|| {
			CliError::OperationFailed(format!(
				"No local account found with username '{}' (or account is already an OIDC account)",
				username
			))
		})?;

	// Find the OIDC user (must have oidc_issuer_id)
	let oidc_user = user::Entity::find()
		.filter(user::Column::OidcEmail.eq(oidc_email.clone()))
		.filter(user::Column::OidcIssuerId.is_not_null())
		.one(&conn)
		.await?
		.ok_or_else(|| {
			CliError::OperationFailed(format!(
				"No OIDC account found with email '{}' (or account is not an OIDC account)",
				oidc_email
			))
		})?;

	progress.finish_and_clear();

	let mut is_server_owner = local_user.is_server_owner;

	// i went back and forth a bit on whether to even handle this here, since there is a dedicated command for changing server ownership.
	// ultimately i added it, but with extra confirmation
	if local_user.is_server_owner {
		is_server_owner = Confirm::new()
            .with_prompt(format!(
                "The local account '{}' is currently the server owner. Do you want to transfer server ownership to the OIDC account '{}' as part of this migration?",
                local_user.username, oidc_user.username
            ))
            .default(false)
            .interact()?;
	}

	println!("\nMigration Summary:");
	println!(
		"  Local account: {} (ID: {})",
		local_user.username, local_user.id
	);
	println!(
		"  OIDC account:  {} (ID: {})",
		oidc_user.username, oidc_user.id
	);
	println!("\nThis will:");
	println!("  1. Transfer all reading sessions and history");
	println!("  2. Transfer all user-associated data like bookmarks and annotations");
	println!("  3. Transfer user preferences");
	println!("  4. Transfer permissions");
	println!(
		"  5. Reassign username '{}' to OIDC account",
		local_user.username
	);
	println!("  6. Delete local account '{}'", local_user.username);
	if is_server_owner {
		println!("  7. Transfer server ownership to OIDC account");
	}

	let confirmation = Confirm::new()
		.with_prompt("\nAre you sure you want to continue?")
		.default(false)
		.interact()?;

	if !confirmation {
		println!("Migration cancelled.");
		return Ok(());
	}

	let progress = default_progress_spinner();

	let txn = conn.begin().await?;

	progress.set_message("Transferring reading sessions...");
	reading_session::Entity::update_many()
		.col_expr(
			reading_session::Column::UserId,
			sea_orm::sea_query::Expr::value(oidc_user.id.clone()),
		)
		.filter(reading_session::Column::UserId.eq(local_user.id.clone()))
		.exec(&txn)
		.await?;

	progress.set_message("Transferring finished reading sessions...");
	finished_reading_session::Entity::update_many()
		.col_expr(
			finished_reading_session::Column::UserId,
			sea_orm::sea_query::Expr::value(oidc_user.id.clone()),
		)
		.filter(finished_reading_session::Column::UserId.eq(local_user.id.clone()))
		.exec(&txn)
		.await?;

	// running list of user-associated entities:
	// - bookmarks
	// - media annotations
	// - favorites (library, media, series)
	// - visit tracking (library)
	// - book club memberships and favorite books within those memberships
	//
	// more sensative ones:
	// - api_keys (arguably)
	// - login activity
	// - library exclusions
	//
	// these, however, will be deleted for security:
	// - refresh tokens
	// - sessions

	progress.set_message("Transferring library visit tracking...");
	last_library_visit::Entity::update_many()
		.col_expr(
			last_library_visit::Column::UserId,
			sea_orm::sea_query::Expr::value(oidc_user.id.clone()),
		)
		.filter(last_library_visit::Column::UserId.eq(local_user.id.clone()))
		.exec(&txn)
		.await?;

	progress.set_message("Transferring library exclusions...");
	library_exclusion::Entity::update_many()
		.col_expr(
			library_exclusion::Column::UserId,
			sea_orm::sea_query::Expr::value(oidc_user.id.clone()),
		)
		.filter(library_exclusion::Column::UserId.eq(local_user.id.clone()))
		.exec(&txn)
		.await?;

	progress.set_message("Deleting refresh tokens and any active auth sessions...");
	refresh_token::Entity::delete_many()
		.filter(refresh_token::Column::UserId.eq(local_user.id.clone()))
		.exec(&txn)
		.await?;
	session::Entity::delete_many()
		.filter(session::Column::UserId.eq(local_user.id.clone()))
		.exec(&txn)
		.await?;

	progress.set_message("Transferring login activity...");
	user_login_activity::Entity::update_many()
		.col_expr(
			user_login_activity::Column::UserId,
			sea_orm::sea_query::Expr::value(oidc_user.id.clone()),
		)
		.filter(user_login_activity::Column::UserId.eq(local_user.id.clone()))
		.exec(&txn)
		.await?;

	progress.set_message("Transferring API keys...");
	api_key::Entity::update_many()
		.col_expr(
			api_key::Column::UserId,
			sea_orm::sea_query::Expr::value(oidc_user.id.clone()),
		)
		.filter(api_key::Column::UserId.eq(local_user.id.clone()))
		.exec(&txn)
		.await?;

	progress.set_message("Transferring bookmarks...");
	bookmark::Entity::update_many()
		.col_expr(
			bookmark::Column::UserId,
			sea_orm::sea_query::Expr::value(oidc_user.id.clone()),
		)
		.filter(bookmark::Column::UserId.eq(local_user.id.clone()))
		.exec(&txn)
		.await?;

	progress.set_message("Transferring annotations...");
	media_annotation::Entity::update_many()
		.col_expr(
			media_annotation::Column::UserId,
			sea_orm::sea_query::Expr::value(oidc_user.id.clone()),
		)
		.filter(media_annotation::Column::UserId.eq(local_user.id.clone()))
		.exec(&txn)
		.await?;

	progress.set_message("Transferring favorites...");
	favorite_library::Entity::update_many()
		.col_expr(
			favorite_library::Column::UserId,
			sea_orm::sea_query::Expr::value(oidc_user.id.clone()),
		)
		.filter(favorite_library::Column::UserId.eq(local_user.id.clone()))
		.exec(&txn)
		.await?;
	favorite_media::Entity::update_many()
		.col_expr(
			favorite_media::Column::UserId,
			sea_orm::sea_query::Expr::value(oidc_user.id.clone()),
		)
		.filter(favorite_media::Column::UserId.eq(local_user.id.clone()))
		.exec(&txn)
		.await?;
	favorite_series::Entity::update_many()
		.col_expr(
			favorite_series::Column::UserId,
			sea_orm::sea_query::Expr::value(oidc_user.id.clone()),
		)
		.filter(favorite_series::Column::UserId.eq(local_user.id.clone()))
		.exec(&txn)
		.await?;

	progress.set_message("Transferring book club memberships...");
	book_club_member::Entity::update_many()
		.col_expr(
			book_club_member::Column::UserId,
			sea_orm::sea_query::Expr::value(oidc_user.id.clone()),
		)
		.filter(book_club_member::Column::UserId.eq(local_user.id.clone()))
		.exec(&txn)
		.await?;

	progress.set_message("Transferring user preferences and permissions...");

	// delete the user preferences since it would just be orphaned but _also_ a unique constraint violation on user_id
	if let Some(oidc_prefs_id) = oidc_user.user_preferences_id {
		user_preferences::Entity::delete_by_id(oidc_prefs_id)
			.exec(&txn)
			.await?;
	}

	let mut oidc_active = oidc_user.clone().into_active_model();
	oidc_active.user_preferences_id = Set(local_user.user_preferences_id);
	oidc_active.permissions = Set(local_user.permissions);
	oidc_active.username = Set(local_user.username.clone());
	oidc_active.is_server_owner = Set(is_server_owner);
	oidc_active.update(&txn).await?;

	progress.set_message("Deleting local account...");
	user::Entity::delete_by_id(local_user.id).exec(&txn).await?;

	progress.set_message("Committing changes...");
	txn.commit().await?;

	progress.finish_with_message(format!(
		"Successfully migrated local account '{}' to OIDC account!",
		username
	));

	Ok(())
}
