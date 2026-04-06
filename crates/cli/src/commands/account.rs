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

	conn.execute_unprepared("PRAGMA foreign_keys = OFF").await?;

	let result = do_migrate_oidc_account(
		local_user,
		oidc_user,
		&conn,
		|message| progress.set_message(message.to_string()),
		is_server_owner,
	)
	.await;

	conn.execute_unprepared("PRAGMA foreign_keys = ON").await?;

	match result {
		Ok(_) => {
			progress.finish_with_message(format!(
				"Successfully migrated local account '{}' to OIDC account!",
				username
			));
			Ok(())
		},
		Err(e) => {
			progress.abandon_with_message(format!("Migration failed: {}", e));
			Err(e)
		},
	}
}

async fn do_migrate_oidc_account<F>(
	local_user: user::Model,
	oidc_user: user::Model,
	conn: &DatabaseConnection,
	post_message: F,
	is_server_owner: bool,
) -> CliResult<()>
where
	F: Fn(&str),
{
	let txn = conn.begin().await?;

	post_message("Transferring reviews...");
	review::Entity::update_many()
		.col_expr(
			review::Column::UserId,
			sea_orm::sea_query::Expr::value(oidc_user.id.clone()),
		)
		.filter(review::Column::UserId.eq(local_user.id.clone()))
		.exec(&txn)
		.await?;

	post_message("Transferring reading sessions...");
	reading_session::Entity::update_many()
		.col_expr(
			reading_session::Column::UserId,
			sea_orm::sea_query::Expr::value(oidc_user.id.clone()),
		)
		.filter(reading_session::Column::UserId.eq(local_user.id.clone()))
		.exec(&txn)
		.await?;

	post_message("Transferring finished reading sessions...");
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

	post_message("Transferring library visit tracking...");
	last_library_visit::Entity::update_many()
		.col_expr(
			last_library_visit::Column::UserId,
			sea_orm::sea_query::Expr::value(oidc_user.id.clone()),
		)
		.filter(last_library_visit::Column::UserId.eq(local_user.id.clone()))
		.exec(&txn)
		.await?;

	post_message("Transferring library exclusions...");
	library_exclusion::Entity::update_many()
		.col_expr(
			library_exclusion::Column::UserId,
			sea_orm::sea_query::Expr::value(oidc_user.id.clone()),
		)
		.filter(library_exclusion::Column::UserId.eq(local_user.id.clone()))
		.exec(&txn)
		.await?;

	post_message("Deleting refresh tokens and any active auth sessions...");
	refresh_token::Entity::delete_many()
		.filter(refresh_token::Column::UserId.eq(local_user.id.clone()))
		.exec(&txn)
		.await?;
	session::Entity::delete_many()
		.filter(session::Column::UserId.eq(local_user.id.clone()))
		.exec(&txn)
		.await?;

	post_message("Transferring login activity...");
	user_login_activity::Entity::update_many()
		.col_expr(
			user_login_activity::Column::UserId,
			sea_orm::sea_query::Expr::value(oidc_user.id.clone()),
		)
		.filter(user_login_activity::Column::UserId.eq(local_user.id.clone()))
		.exec(&txn)
		.await?;

	post_message("Transferring API keys...");
	api_key::Entity::update_many()
		.col_expr(
			api_key::Column::UserId,
			sea_orm::sea_query::Expr::value(oidc_user.id.clone()),
		)
		.filter(api_key::Column::UserId.eq(local_user.id.clone()))
		.exec(&txn)
		.await?;

	post_message("Transferring bookmarks...");
	bookmark::Entity::update_many()
		.col_expr(
			bookmark::Column::UserId,
			sea_orm::sea_query::Expr::value(oidc_user.id.clone()),
		)
		.filter(bookmark::Column::UserId.eq(local_user.id.clone()))
		.exec(&txn)
		.await?;

	post_message("Transferring annotations...");
	media_annotation::Entity::update_many()
		.col_expr(
			media_annotation::Column::UserId,
			sea_orm::sea_query::Expr::value(oidc_user.id.clone()),
		)
		.filter(media_annotation::Column::UserId.eq(local_user.id.clone()))
		.exec(&txn)
		.await?;

	post_message("Transferring favorites...");
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

	post_message("Transferring book club memberships...");
	book_club_member::Entity::update_many()
		.col_expr(
			book_club_member::Column::UserId,
			sea_orm::sea_query::Expr::value(oidc_user.id.clone()),
		)
		.filter(book_club_member::Column::UserId.eq(local_user.id.clone()))
		.exec(&txn)
		.await?;

	post_message("Transferring user preferences and permissions...");

	if let Some(oidc_prefs_id) = oidc_user.user_preferences_id {
		user_preferences::Entity::delete_by_id(oidc_prefs_id)
			.exec(&txn)
			.await?;
	}

	post_message("Deleting local account...");
	user::Entity::delete_by_id(local_user.id).exec(&txn).await?;

	post_message("Updating OIDC account with local account data...");

	let oidc_user_in_txn = user::Entity::find_by_id(oidc_user.id.clone())
		.one(&txn)
		.await?
		.ok_or_else(|| {
			CliError::OperationFailed("OIDC user not found in transaction".to_string())
		})?;

	let mut oidc_active = oidc_user_in_txn.into_active_model();
	oidc_active.user_preferences_id = Set(local_user.user_preferences_id);
	oidc_active.permissions = Set(local_user.permissions);
	oidc_active.username = Set(local_user.username.clone());
	oidc_active.is_server_owner = Set(is_server_owner);
	oidc_active.update(&txn).await?;

	post_message("Committing changes...");
	txn.commit().await?;

	Ok(())
}

#[cfg(test)]
mod tests {
	use migrations::{Migrator, MigratorTrait};
	use models::{
		entity::{
			api_key, bookmark, favorite_library, favorite_media, favorite_series,
			finished_reading_session, last_library_visit, library, library_config,
			library_exclusion, media, media_annotation, reading_session, refresh_token,
			review, series, session, user, user_login_activity, user_preferences,
		},
		shared::{
			api_key::APIKeyPermissions,
			enums::{
				FileStatus, LibraryPattern, LibraryViewMode, ReadingDirection,
				ReadingImageScaleFit, ReadingMode,
			},
			readium::ReadiumLocator,
		},
	};
	use sea_orm::{
		prelude::DateTimeWithTimeZone, sqlx::types::chrono::Utc, ActiveModelTrait,
		ColumnTrait, ConnectionTrait, Database, DbConn, EntityTrait, QueryFilter, Set,
	};

	use super::do_migrate_oidc_account;

	async fn test_database() -> DbConn {
		let db = Database::connect("sqlite::memory:")
			.await
			.expect("failed to connect to test database");

		Migrator::up(&db, None).await.expect("Failed to migrate");

		db
	}

	#[derive(Default)]
	struct ExampleUser {}

	impl ExampleUser {
		fn active_model() -> user::ActiveModel {
			user::ActiveModel {
				username: sea_orm::Set("oromei".to_string()),
				hashed_password: sea_orm::Set("hashed_password".to_string()),
				is_server_owner: sea_orm::Set(true),
				is_locked: sea_orm::Set(false),
				..Default::default()
			}
		}

		async fn insert(
			&self,
			db: &DbConn,
			user: Option<user::ActiveModel>,
		) -> user::Model {
			let model = user.unwrap_or_else(|| Self::active_model());

			let user = model.insert(db).await.expect("could not insert user");
			let _user_preferences = user_preferences::ActiveModel {
				user_id: Set(Some(user.id.clone())),
				..Default::default()
			}
			.insert(db)
			.await
			.expect("could not insert user preferences");

			user
		}
	}

	fn library_config() -> library_config::ActiveModel {
		library_config::ActiveModel {
			convert_rar_to_zip: Set(false),
			hard_delete_conversions: Set(false),
			default_reading_dir: Set(ReadingDirection::Ltr),
			default_reading_mode: Set(ReadingMode::Paged),
			default_reading_image_scale_fit: Set(ReadingImageScaleFit::Height),
			generate_file_hashes: Set(false),
			generate_koreader_hashes: Set(false),
			process_metadata: Set(true),
			watch: Set(false),
			library_pattern: Set(LibraryPattern::SeriesBased),
			default_library_view_mode: Set(LibraryViewMode::Series),
			hide_series_view: Set(false),
			skip_book_overview: Set(false),
			process_thumbnail_colors_even_without_config: Set(false),
			..Default::default()
		}
	}

	async fn setup_oidc_migration_test(local_user: &user::Model, db: &DbConn) {
		let library_config_1 = library_config()
			.insert(db)
			.await
			.expect("could not insert library config");

		let library = library::ActiveModel {
			name: Set("Test Library".to_string()),
			path: Set("/test/library".to_string()),
			status: Set(FileStatus::Ready),
			config_id: Set(library_config_1.id),
			..Default::default()
		}
		.insert(db)
		.await
		.expect("could not insert library");

		let library_config_2 = library_config()
			.insert(db)
			.await
			.expect("could not insert library config");

		let excluded_from_local_user_library = library::ActiveModel {
			name: Set("Test Library EXCLUDED".to_string()),
			path: Set("/test/library-excluded".to_string()),
			status: Set(FileStatus::Ready),
			config_id: Set(library_config_2.id),
			..Default::default()
		}
		.insert(db)
		.await
		.expect("could not insert library");

		let series = series::ActiveModel {
			name: Set("Test Series".to_string()),
			library_id: Set(Some(library.id.clone())),
			path: Set("/test/series".to_string()),
			status: Set(FileStatus::Ready),
			..Default::default()
		}
		.insert(db)
		.await
		.expect("could not insert series");

		for i in 0..5 {
			let _media = media::ActiveModel {
				name: Set(format!("Test Media {}", i + 1)),
				path: Set(format!("/test/series/media{}", i + 1)),
				series_id: Set(Some(series.id.clone())),
				extension: Set("cbz".to_string()),
				pages: Set(100 + i),
				status: Set(FileStatus::Ready),
				size: Set(1024),
				..Default::default()
			}
			.insert(db)
			.await
			.expect("could not insert media");
		}

		let media_list = media::Entity::find()
			.filter(media::Column::SeriesId.eq(series.id.clone()))
			.all(db)
			.await
			.expect("could not fetch media");

		// let's have an active session for books 0 and 2, and a finished reading session for book 1
		for i in 0..3 {
			if i == 1 {
				finished_reading_session::ActiveModel {
					user_id: Set(local_user.id.clone()),
					media_id: Set(media_list[1].id.clone()),
					started_at: Set(DateTimeWithTimeZone::from(Utc::now())),
					completed_at: Set(DateTimeWithTimeZone::from(Utc::now())),
					..Default::default()
				}
				.insert(db)
				.await
				.expect("could not insert finished reading session for media 1");
			} else {
				reading_session::ActiveModel {
					page: Set(Some(10)),
					user_id: Set(local_user.id.clone()),
					media_id: Set(media_list[i].id.clone()),
					..Default::default()
				}
				.insert(db)
				.await
				.expect(&format!("could not insert reading session for media {}", i));
			}
		}

		// let's create a review for media 0 as well
		review::ActiveModel {
			user_id: Set(local_user.id.clone()),
			media_id: Set(media_list[0].id.clone()),
			rating: Set(4),
			content: Set(Some("Great book!".to_string())),
			is_private: Set(false),
			..Default::default()
		}
		.insert(db)
		.await
		.expect("could not insert review for media 0");

		// bookmark for media 2
		bookmark::ActiveModel {
			user_id: Set(local_user.id.clone()),
			media_id: Set(media_list[2].id.clone()),
			locator: Set(Some(ReadiumLocator {
				chapter_title: "Chapter Foo".to_string(),
				href: "chapter1.html".to_string(),
				locations: None,
				text: None,
				title: Some("Chapter 1".to_string()),
				r#type: "application/xhtml+xml".to_string(),
			})),
			..Default::default()
		}
		.insert(db)
		.await
		.expect("could not insert bookmark for media 2");

		// media annotation for media 3
		media_annotation::ActiveModel {
			user_id: Set(local_user.id.clone()),
			media_id: Set(media_list[3].id.clone()),
			locator: Set(ReadiumLocator {
				chapter_title: "Chapter 3".to_string(),
				href: "chapter3.html".to_string(),
				locations: None,
				text: None,
				title: Some("Chapter 3".to_string()),
				r#type: "application/xhtml+xml".to_string(),
			}),
			annotation_text: Set(Some("Important note!".to_string())),
			..Default::default()
		}
		.insert(db)
		.await
		.expect("could not insert media annotation for media 3");

		favorite_library::ActiveModel {
			user_id: Set(local_user.id.clone()),
			library_id: Set(library.id.clone()),
			..Default::default()
		}
		.insert(db)
		.await
		.expect("could not insert favorite library");

		favorite_media::ActiveModel {
			user_id: Set(local_user.id.clone()),
			media_id: Set(media_list[0].id.clone()),
			..Default::default()
		}
		.insert(db)
		.await
		.expect("could not insert favorite media");

		favorite_series::ActiveModel {
			user_id: Set(local_user.id.clone()),
			series_id: Set(series.id.clone()),
			..Default::default()
		}
		.insert(db)
		.await
		.expect("could not insert favorite series");

		last_library_visit::ActiveModel {
			user_id: Set(local_user.id.clone()),
			library_id: Set(library.id.clone()),
			timestamp: Set(DateTimeWithTimeZone::from(Utc::now())),
			..Default::default()
		}
		.insert(db)
		.await
		.expect("could not insert last library visit");

		library_exclusion::ActiveModel {
			user_id: Set(local_user.id.clone()),
			library_id: Set(excluded_from_local_user_library.id.clone()),
			..Default::default()
		}
		.insert(db)
		.await
		.expect("could not insert library exclusion for local user");

		api_key::ActiveModel {
			user_id: Set(local_user.id.clone()),
			long_token_hash: Set("hashed_token".to_string()),
			short_token: Set("short".to_string()),
			name: Set("Test API Key".to_string()),
			permissions: Set(APIKeyPermissions::inherit()),
			..Default::default()
		}
		.insert(db)
		.await
		.expect("could not insert API key for local user");

		// give them an auth session, refresh token, and one login activity record each as well
		session::ActiveModel {
			user_id: Set(local_user.id.clone()),
			session_id: Set("session123".to_string()),
			// i know now = expired but its fine for this
			expiry_time: Set(DateTimeWithTimeZone::from(Utc::now())),
			..Default::default()
		}
		.insert(db)
		.await
		.expect("could not insert session for local user");

		refresh_token::ActiveModel {
			id: Set("refresh123".to_string()),
			expires_at: Set(DateTimeWithTimeZone::from(Utc::now())),
			user_id: Set(local_user.id.clone()),
			..Default::default()
		}
		.insert(db)
		.await
		.expect("could not insert refresh token for local user");

		for i in 0..2 {
			user_login_activity::ActiveModel {
				user_id: Set(local_user.id.clone()),
				authentication_successful: Set(i % 2 == 0),
				ip_address: Set("localhost".to_string()),
				timestamp: Set(DateTimeWithTimeZone::from(Utc::now())),
				user_agent: Set("TestAgent/1.0".to_string()),
				..Default::default()
			}
			.insert(db)
			.await
			.expect("could not insert login activity for local user");
		}
	}

	#[tokio::test]
	async fn test_oidc_user_migration() {
		let db = test_database().await;

		let local_user = ExampleUser {}.insert(&db, None).await;
		let oidc_user = ExampleUser {}
			.insert(
				&db,
				Some(user::ActiveModel {
					username: Set("oidc_user".to_string()),
					oidc_email: Set(Some("user@proton.me".to_string())),
					oidc_issuer_id: Set(Some("https://example.com/oidc".to_string())),
					is_server_owner: Set(false),
					..ExampleUser::active_model()
				}),
			)
			.await;

		setup_oidc_migration_test(&local_user, &db).await;

		db.execute_unprepared("PRAGMA foreign_keys = OFF")
			.await
			.expect("Failed to disable foreign keys");

		let result = do_migrate_oidc_account(
			local_user.clone(),
			oidc_user.clone(),
			&db,
			|_| {},
			true,
		)
		.await;

		db.execute_unprepared("PRAGMA foreign_keys = ON")
			.await
			.expect("Failed to re-enable foreign keys");

		assert!(result.is_ok(), "Migration failed: {:?}", result.err());

		let local_user_check = user::Entity::find_by_id(&local_user.id)
			.one(&db)
			.await
			.expect("Failed to query local user");
		assert!(local_user_check.is_none(), "Local user should be deleted");

		let updated_oidc_user = user::Entity::find_by_id(&oidc_user.id)
			.one(&db)
			.await
			.expect("Failed to query OIDC user")
			.expect("OIDC user should exist");
		assert_eq!(
			updated_oidc_user.username, local_user.username,
			"OIDC user should have local user's username"
		);
		assert_eq!(
			updated_oidc_user.user_preferences_id, local_user.user_preferences_id,
			"OIDC user should have local user's preferences"
		);
		assert!(
			updated_oidc_user.is_server_owner,
			"OIDC user should be server owner"
		);

		let reading_sessions = reading_session::Entity::find()
			.filter(reading_session::Column::UserId.eq(&oidc_user.id))
			.all(&db)
			.await
			.expect("Failed to query reading sessions");
		assert_eq!(
			reading_sessions.len(),
			2,
			"Should have 2 reading sessions transferred"
		);

		let finished_sessions = finished_reading_session::Entity::find()
			.filter(finished_reading_session::Column::UserId.eq(&oidc_user.id))
			.all(&db)
			.await
			.expect("Failed to query finished reading sessions");
		assert_eq!(
			finished_sessions.len(),
			1,
			"Should have 1 finished reading session transferred"
		);

		let reviews = review::Entity::find()
			.filter(review::Column::UserId.eq(&oidc_user.id))
			.all(&db)
			.await
			.expect("Failed to query reviews");
		assert_eq!(reviews.len(), 1, "Should have 1 review transferred");

		let bookmarks = bookmark::Entity::find()
			.filter(bookmark::Column::UserId.eq(&oidc_user.id))
			.all(&db)
			.await
			.expect("Failed to query bookmarks");
		assert_eq!(bookmarks.len(), 1, "Should have 1 bookmark transferred");

		let annotations = media_annotation::Entity::find()
			.filter(media_annotation::Column::UserId.eq(&oidc_user.id))
			.all(&db)
			.await
			.expect("Failed to query annotations");
		assert_eq!(annotations.len(), 1, "Should have 1 annotation transferred");

		let favorite_libraries = favorite_library::Entity::find()
			.filter(favorite_library::Column::UserId.eq(&oidc_user.id))
			.all(&db)
			.await
			.expect("Failed to query favorite libraries");
		assert_eq!(
			favorite_libraries.len(),
			1,
			"Should have 1 favorite library transferred"
		);

		let favorite_media_list = favorite_media::Entity::find()
			.filter(favorite_media::Column::UserId.eq(&oidc_user.id))
			.all(&db)
			.await
			.expect("Failed to query favorite media");
		assert_eq!(
			favorite_media_list.len(),
			1,
			"Should have 1 favorite media transferred"
		);

		let favorite_series_list = favorite_series::Entity::find()
			.filter(favorite_series::Column::UserId.eq(&oidc_user.id))
			.all(&db)
			.await
			.expect("Failed to query favorite series");
		assert_eq!(
			favorite_series_list.len(),
			1,
			"Should have 1 favorite series transferred"
		);

		let exclusions = library_exclusion::Entity::find()
			.filter(library_exclusion::Column::UserId.eq(&oidc_user.id))
			.all(&db)
			.await
			.expect("Failed to query library exclusions");
		assert_eq!(
			exclusions.len(),
			1,
			"Should have 1 library exclusion transferred"
		);

		let visits = last_library_visit::Entity::find()
			.filter(last_library_visit::Column::UserId.eq(&oidc_user.id))
			.all(&db)
			.await
			.expect("Failed to query library visits");
		assert_eq!(visits.len(), 1, "Should have 1 library visit transferred");

		let api_keys = api_key::Entity::find()
			.filter(api_key::Column::UserId.eq(&oidc_user.id))
			.all(&db)
			.await
			.expect("Failed to query API keys");
		assert_eq!(api_keys.len(), 1, "Should have 1 API key transferred");

		let login_activity = user_login_activity::Entity::find()
			.filter(user_login_activity::Column::UserId.eq(&oidc_user.id))
			.all(&db)
			.await
			.expect("Failed to query login activity");
		assert_eq!(
			login_activity.len(),
			2,
			"Should have 2 login activity records transferred"
		);

		let sessions = session::Entity::find()
			.filter(session::Column::UserId.eq(&local_user.id))
			.all(&db)
			.await
			.expect("Failed to query sessions");
		assert_eq!(sessions.len(), 0, "Local user's sessions should be deleted"); // not transferred

		let refresh_tokens = refresh_token::Entity::find()
			.filter(refresh_token::Column::UserId.eq(&local_user.id))
			.all(&db)
			.await
			.expect("Failed to query refresh tokens");
		assert_eq!(
			refresh_tokens.len(),
			0,
			"Local user's refresh tokens should be deleted"
		); // not transferred
	}
}
