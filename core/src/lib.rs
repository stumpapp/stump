// This was added as a fix for https://github.com/stumpapp/stump/issues/146
// I am not entirely sure why this issue cropped up all of the sudden, but
// this seems to resolve it in a musl environment.
#![recursion_limit = "256"]
#![warn(clippy::dbg_macro)]

use std::{str::FromStr, sync::Arc};

pub mod api_key;
pub mod config;
mod context;
pub mod database;
pub mod error;
mod event;
pub mod filesystem;
pub mod job;
pub mod opds;
pub mod utils;

use config::logging::STUMP_SHADOW_TEXT;
use config::StumpConfig;
use job::{JobController, JobScheduler};
use models::entity::server_config;
use sea_orm::{
	prelude::*, ActiveValue::Set, DatabaseBackend, EntityTrait, PaginatorTrait,
	QuerySelect, SelectColumns, Statement,
};

pub use context::Ctx;
pub use error::{CoreError, CoreResult};
pub use event::CoreEvent;

pub use email::{
	AttachmentPayload, EmailContentType, EmailerClient, EmailerClientConfig,
};

use crate::database::JournalMode;

/// A type alias strictly for explicitness in the return type of `init_journal_mode`.
type JournalModeChanged = bool;
/// A type alias strictly for explicitness in the return type of `init_encryption`.
type EncryptionKeySet = bool;

/// The [`StumpCore`] struct is the main entry point for any server-side Stump
/// applications. It is responsible for managing incoming tasks ([`InternalCoreTask`]),
/// outgoing events ([`CoreEvent`](event::CoreEvent)), and providing access to the database
/// via the core's [`Ctx`].
///
/// [`StumpCore`] expects the consuming application to determine its configuration prior to startup.
/// [`config::bootstrap_config_dir`] enables consumers to fetch the configuration directory automatically,
/// and [`StumpCore::init_config`](#method.init_config) will load any Stump.toml in the config directory
/// or environment variables to return a [`StumpConfig`] struct.
///
/// ## Example:
/// ```no_run
/// use stump_core::{config, StumpCore};
///
/// #[tokio::main]
/// async fn main() {
///   let config_dir = config::bootstrap_config_dir();
///   let config = StumpCore::init_config(config_dir).unwrap();
///
///   let core = StumpCore::new(config).await;
/// }
/// ```
pub struct StumpCore {
	ctx: Ctx,
}

impl StumpCore {
	/// Creates a new instance of [`StumpCore`] and returns it wrapped in an [`std::sync::Arc`].
	pub async fn new(config: StumpConfig) -> StumpCore {
		let core_ctx = Ctx::new(config).await;
		StumpCore { ctx: core_ctx }
	}

	/// A three-step configuration initialization function.
	///
	/// 1. Loads configuration variables from Stump.toml, located at the input
	///    `config_dir`, if such a file exists.
	///
	/// 2. Overrides variables with those set in the environment.
	///
	/// 3. Creates the configuration directory (if it does not exist) and writes
	///    to Stump.toml.
	///
	/// Returns the configuration variables in a `StumpConfig` struct.
	pub fn init_config(config_dir: String) -> CoreResult<StumpConfig> {
		let mut config = StumpConfig::new(config_dir)
			// Load config file (if any)
			.with_config_file()?
			// Overlay environment variables
			.with_environment()?;

		// TODO: I couldn't get this fully working inside the macro but would like to revisit
		if let Some(env_oidc) = config::OidcConfig::from_env() {
			config.oidc = Some(env_oidc);
		}

		// Write ensure that config directory exists and write Stump.toml
		config.write_config_dir()?;

		Ok(config)
	}

	/// Returns [`StumpCore`] wrapped in an [`Arc`]. Will take ownership of self. Created
	/// for convenience if ever needed to create an instance without using the `new` method.
	pub fn arced(self) -> Arc<Self> {
		Arc::new(self)
	}

	/// Returns a new instance of [`Ctx`]. This is the main context struct for the core,
	/// providing access to the database and internal channels.
	pub fn get_context(&self) -> Ctx {
		self.ctx.clone()
	}

	pub fn get_job_controller(&self) -> Arc<JobController> {
		self.ctx.job_controller.clone()
	}

	/// Returns the shadow text for the core. This is just the fun ascii art that
	/// is printed to the console when the server starts.
	pub fn get_shadow_text(&self) -> &str {
		STUMP_SHADOW_TEXT
	}

	/// Initializes the server configuration record. This will only create a new record if one
	/// does not already exist.
	pub async fn init_server_config(&self) -> Result<(), CoreError> {
		let config_exists = server_config::Entity::find()
			.count(self.ctx.conn.as_ref())
			.await? > 0;

		if !config_exists {
			let active_model = server_config::ActiveModel {
				initial_wal_setup_complete: Set(false),
				..Default::default()
			};
			active_model.insert(self.ctx.conn.as_ref()).await?;
		}

		Ok(())
	}

	// TODO: This is insecure for obvious reasons, and should be removed in the future. This was added
	// to reduce friction of setting up the server for folks who might not understand encryption keys.
	/// Initializes the encryption key for the database. This will only set the encryption key
	/// if one does not already exist.
	#[tracing::instrument(skip(self), err)]
	pub async fn init_encryption(&self) -> Result<EncryptionKeySet, CoreError> {
		let conn = self.ctx.conn.as_ref();

		let encryption_key_set = server_config::Entity::find()
			.select_only()
			.select_column(server_config::Column::EncryptionKey)
			.into_model::<server_config::EncryptionKeySelect>()
			.one(conn)
			.await?
			.is_some_and(|config| config.encryption_key.is_some());
		tracing::trace!(encryption_key_set, "Encryption key set");

		if encryption_key_set {
			Ok(false)
		} else {
			let encryption_key = utils::encryption::create_encryption_key()?;
			let affected_rows = server_config::Entity::update_many()
				.col_expr(
					server_config::Column::EncryptionKey,
					Expr::value(Some(encryption_key)),
				)
				.exec(conn)
				.await?
				.rows_affected;
			tracing::trace!(affected_rows, "Updated encryption key");
			if affected_rows > 1 {
				tracing::warn!("More than one encryption key was updated? This is definitely not expected");
			}
			Ok(affected_rows > 0)
		}
	}

	// TODO(sea-orm): I don't think this is actually needed anymore!
	/// Initializes the journal mode for the database. This will only set the journal mode to WAL
	/// provided a few conditions are met:
	///
	/// 1. The initial WAL setup has not already been completed on first run
	/// 2. The journal mode is not already set to WAL
	pub async fn init_journal_mode(&self) -> Result<JournalModeChanged, CoreError> {
		let conn = self.ctx.conn.as_ref();

		let wal_mode_setup_completed = server_config::Entity::find()
			.filter(server_config::Column::InitialWalSetupComplete.eq(true))
			.count(conn)
			.await? > 0;

		if wal_mode_setup_completed {
			tracing::trace!("Initial WAL setup has already been completed, skipping");
			Ok(false)
		} else {
			let journal_mode = match conn
				.query_one(Statement::from_string(
					DatabaseBackend::Sqlite,
					"PRAGMA journal_mode;",
				))
				.await?
			{
				Some(result) => {
					let raw = result.try_get::<String>("", "journal_mode")?;
					JournalMode::from_str(&raw).map_err(|e| {
						CoreError::InternalError(format!(
							"Failed to parse journal mode: {}",
							e
						))
					})?
				},
				None => {
					tracing::warn!("No journal mode found! Defaulting to WAL assumption");
					JournalMode::default()
				},
			};

			if journal_mode == JournalMode::WAL {
				tracing::trace!("Journal mode is already set to WAL, skipping");
			} else {
				tracing::trace!("Journal mode is not set to WAL!");
				let result = conn.execute_unprepared("PRAGMA journal_mode=WAL;").await?;
				tracing::debug!(?result, "Set journal mode to WAL");
			}

			let affected_rows = server_config::Entity::update_many()
				.col_expr(
					server_config::Column::InitialWalSetupComplete,
					Expr::value(true),
				)
				.exec(conn)
				.await?
				.rows_affected;
			tracing::trace!(affected_rows, "Updated initial WAL setup complete flag");

			Ok(journal_mode != JournalMode::WAL)
		}
	}

	pub async fn init_scheduler(&self) -> Result<Arc<JobScheduler>, CoreError> {
		JobScheduler::init(self.ctx.arced()).await
	}

	pub async fn init_library_watcher(&self) -> CoreResult<()> {
		self.ctx.library_watcher.init().await
	}
}
