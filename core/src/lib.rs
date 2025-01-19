// This was added as a fix for https://github.com/stumpapp/stump/issues/146
// I am not entirely sure why this issue cropped up all of the sudden, but
// this seems to resolve it in a musl environment.
#![recursion_limit = "256"]
#![warn(clippy::dbg_macro)]

use std::sync::Arc;

// TODO: cleanup hoisted crates to only what is needed

pub mod config;
pub mod db;
mod event;
pub mod filesystem;
pub mod job;
pub mod metadata_getters;
pub mod opds;
mod utils;

mod context;
pub mod error;

#[rustfmt::skip]
#[allow(warnings, unused)]
pub mod prisma;

use config::logging::STUMP_SHADOW_TEXT;
use config::StumpConfig;
use db::{DBPragma, JournalMode};
use job::{JobController, JobScheduler};
use prisma::server_config;

pub use context::Ctx;
pub use error::{CoreError, CoreResult};
pub use event::CoreEvent;

pub use email::{
	AttachmentPayload, EmailContentType, EmailerClient, EmailerClientConfig,
};

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
		let config = StumpConfig::new(config_dir)
			// Load config file (if any)
			.with_config_file()?
			// Overlay environment variables
			.with_environment()?;

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

	/// Runs the database migrations
	pub async fn run_migrations(&self) -> Result<(), CoreError> {
		db::migration::run_migrations(&self.ctx.db).await
	}

	/// Initializes the server configuration record. This will only create a new record if one
	/// does not already exist.
	pub async fn init_server_config(&self) -> Result<(), CoreError> {
		let config_exists = self
			.ctx
			.db
			.server_config()
			.find_first(vec![])
			.exec()
			.await?
			.is_some();

		if !config_exists {
			self.ctx.db.server_config().create(vec![]).exec().await?;
		}

		Ok(())
	}

	// TODO: This is insecure for obvious reasons, and should be removed in the future. This was added
	// to reduce friction of setting up the server for folks who might not understand encryption keys.
	/// Initializes the encryption key for the database. This will only set the encryption key
	/// if one does not already exist.
	pub async fn init_encryption(&self) -> Result<EncryptionKeySet, CoreError> {
		let client = self.ctx.db.clone();

		let encryption_key_set = client
			.server_config()
			.find_first(vec![server_config::encryption_key::not(None)])
			.exec()
			.await?
			.is_some();

		if encryption_key_set {
			Ok(false)
		} else {
			let encryption_key = utils::create_encryption_key()?;
			let affected_rows = client
				.server_config()
				.update_many(
					vec![],
					vec![server_config::encryption_key::set(Some(encryption_key))],
				)
				.exec()
				.await?;
			tracing::trace!(affected_rows, "Updated encryption key");
			if affected_rows > 1 {
				tracing::warn!("More than one encryption key was updated? This is definitely not expected");
			}
			Ok(affected_rows > 0)
		}
	}

	/// Initializes the journal mode for the database. This will only set the journal mode to WAL
	/// provided a few conditions are met:
	///
	/// 1. The initial WAL setup has not already been completed on first run
	/// 2. The journal mode is not already set to WAL
	pub async fn init_journal_mode(&self) -> Result<JournalModeChanged, CoreError> {
		let client = self.ctx.db.clone();

		let wal_mode_setup_completed = client
			.server_config()
			.find_first(vec![server_config::initial_wal_setup_complete::equals(
				true,
			)])
			.exec()
			.await?
			.is_some();

		if wal_mode_setup_completed {
			tracing::trace!("Initial WAL setup has already been completed, skipping");
			Ok(false)
		} else {
			let journal_mode = client.get_journal_mode().await?;

			if journal_mode == JournalMode::WAL {
				tracing::trace!("Journal mode is already set to WAL, skipping");
			} else {
				tracing::trace!("Journal mode is not set to WAL!");
				let updated_journal_mode =
					client.set_journal_mode(JournalMode::WAL).await?;
				tracing::debug!(
					"Initial journal mode has been set to {:?}",
					updated_journal_mode
				);
			}

			let _affected_rows = client
				.server_config()
				.update_many(
					vec![],
					vec![server_config::initial_wal_setup_complete::set(true)],
				)
				.exec()
				.await?;
			tracing::trace!(_affected_rows, "Updated initial WAL setup complete flag");

			Ok(journal_mode != JournalMode::WAL)
		}
	}

	pub async fn init_scheduler(&self) -> Result<Arc<JobScheduler>, CoreError> {
		JobScheduler::init(self.ctx.arced()).await
	}
}

#[allow(unused_imports)]
mod tests {
	use std::{fs::File, io::Write, path::PathBuf};

	use common::*;
	use email::EmailerClientConfig;
	use specta::{
		ts::{export, BigIntExportBehavior, ExportConfiguration, TsExportError},
		NamedType,
	};

	use crate::{
		db::{
			entity::*,
			filter::*,
			query::{ordering::*, pagination::*},
		},
		filesystem::{image::*, scanner::*, *},
		job::*,
		CoreEvent,
	};

	#[allow(dead_code)]
	fn ts_export<T>() -> Result<String, TsExportError>
	where
		T: NamedType,
	{
		export::<T>(&ExportConfiguration::new().bigint(BigIntExportBehavior::Number))
	}

	#[test]
	#[ignore]
	fn codegen() -> Result<(), Box<dyn std::error::Error>> {
		let path = PathBuf::from(env!("CARGO_MANIFEST_DIR"))
			.join("../packages/sdk/src/types")
			.join("generated.ts");

		println!("Please ensure to only generate types using `cargo codegen`");

		let mut file = File::create(path)?;

		file.write_all(b"// DO NOT MODIFY THIS FILE, IT IS AUTOGENERATED\n\n")?;

		file.write_all(b"// CORE TYPE GENERATION\n\n")?;

		file.write_all(format!("{}\n\n", ts_export::<PaginationQuery>()?).as_bytes())?;

		file.write_all(format!("{}\n\n", ts_export::<CoreEvent>()?).as_bytes())?;

		file.write_all(format!("{}\n\n", ts_export::<EntityVisibility>()?).as_bytes())?;
		file.write_all(format!("{}\n\n", ts_export::<AccessRole>()?).as_bytes())?;

		file.write_all(format!("{}\n\n", ts_export::<Log>()?).as_bytes())?;
		file.write_all(format!("{}\n\n", ts_export::<LogMetadata>()?).as_bytes())?;
		file.write_all(format!("{}\n\n", ts_export::<LogLevel>()?).as_bytes())?;

		file.write_all(format!("{}\n\n", ts_export::<PersistedJob>()?).as_bytes())?;
		// file.write_all(format!("{}\n\n", ts_export::<CoreJobOutput>()?).as_bytes())?;
		// TODO: Fix this... Must move all job defs to the core... Otherwise, the `unknown` type swallows the others in the union
		file.write_all(
			"export type CoreJobOutput = LibraryScanOutput | SeriesScanOutput | ThumbnailGenerationOutput\n\n".to_string()
			.as_bytes(),
		)?;
		file.write_all(format!("{}\n\n", ts_export::<JobUpdate>()?).as_bytes())?;
		file.write_all(format!("{}\n\n", ts_export::<JobProgress>()?).as_bytes())?;
		file.write_all(format!("{}\n\n", ts_export::<LibraryScanOutput>()?).as_bytes())?;
		file.write_all(format!("{}\n\n", ts_export::<SeriesScanOutput>()?).as_bytes())?;
		file.write_all(
			format!("{}\n\n", ts_export::<ThumbnailGenerationJobVariant>()?).as_bytes(),
		)?;
		file.write_all(
			format!("{}\n\n", ts_export::<ThumbnailGenerationJobParams>()?).as_bytes(),
		)?;
		file.write_all(
			format!("{}\n\n", ts_export::<ThumbnailGenerationOutput>()?).as_bytes(),
		)?;

		file.write_all(format!("{}\n\n", ts_export::<User>()?).as_bytes())?;
		file.write_all(format!("{}\n\n", ts_export::<PartialUser>()?).as_bytes())?;
		file.write_all(format!("{}\n\n", ts_export::<UserPermission>()?).as_bytes())?;
		file.write_all(format!("{}\n\n", ts_export::<AgeRestriction>()?).as_bytes())?;

		file.write_all(format!("{}\n\n", ts_export::<APIKey>()?).as_bytes())?;
		file.write_all(
			format!("{}\n\n", ts_export::<InheritPermissionValue>()?).as_bytes(),
		)?;
		file.write_all(format!("{}\n\n", ts_export::<APIKeyPermissions>()?).as_bytes())?;

		file.write_all(format!("{}\n\n", ts_export::<SupportedFont>()?).as_bytes())?;

		file.write_all(format!("{}\n\n", ts_export::<NavigationMode>()?).as_bytes())?;
		file.write_all(format!("{}\n\n", ts_export::<HomeItem>()?).as_bytes())?;
		file.write_all(
			format!("{}\n\n", ts_export::<NavigationItemDisplayOptions>()?).as_bytes(),
		)?;
		file.write_all(format!("{}\n\n", ts_export::<NavigationItem>()?).as_bytes())?;
		file.write_all(
			format!("{}\n\n", ts_export::<ArrangementItem<()>>()?).as_bytes(),
		)?;
		file.write_all(format!("{}\n\n", ts_export::<Arrangement<()>>()?).as_bytes())?;
		file.write_all(format!("{}\n\n", ts_export::<UserPreferences>()?).as_bytes())?;

		file.write_all(format!("{}\n\n", ts_export::<LoginActivity>()?).as_bytes())?;

		file.write_all(format!("{}\n\n", ts_export::<EmailerSendTo>()?).as_bytes())?;
		file.write_all(format!("{}\n\n", ts_export::<EmailerConfig>()?).as_bytes())?;
		file.write_all(
			format!("{}\n\n", ts_export::<EmailerClientConfig>()?).as_bytes(),
		)?;

		file.write_all(format!("{}\n\n", ts_export::<SMTPEmailer>()?).as_bytes())?;
		file.write_all(
			format!("{}\n\n", ts_export::<RegisteredEmailDevice>()?).as_bytes(),
		)?;
		file.write_all(format!("{}\n\n", ts_export::<EmailerSendRecord>()?).as_bytes())?;
		file.write_all(format!("{}\n\n", ts_export::<AttachmentMeta>()?).as_bytes())?;

		file.write_all(format!("{}\n\n", ts_export::<ReadingDirection>()?).as_bytes())?;
		file.write_all(format!("{}\n\n", ts_export::<ReadingMode>()?).as_bytes())?;
		file.write_all(
			format!("{}\n\n", ts_export::<ReadingImageScaleFit>()?).as_bytes(),
		)?;

		file.write_all(format!("{}\n\n", ts_export::<FileStatus>()?).as_bytes())?;
		file.write_all(format!("{}\n\n", ts_export::<Library>()?).as_bytes())?;
		file.write_all(format!("{}\n\n", ts_export::<LibraryPattern>()?).as_bytes())?;
		file.write_all(format!("{}\n\n", ts_export::<LibraryScanMode>()?).as_bytes())?;
		file.write_all(format!("{}\n\n", ts_export::<IgnoreRules>()?).as_bytes())?;
		file.write_all(format!("{}\n\n", ts_export::<LibraryConfig>()?).as_bytes())?;
		file.write_all(format!("{}\n\n", ts_export::<LibraryStats>()?).as_bytes())?;

		file.write_all(format!("{}\n\n", ts_export::<SeriesMetadata>()?).as_bytes())?;
		file.write_all(format!("{}\n\n", ts_export::<Series>()?).as_bytes())?;
		file.write_all(format!("{}\n\n", ts_export::<MediaMetadata>()?).as_bytes())?;
		file.write_all(format!("{}\n\n", ts_export::<Media>()?).as_bytes())?;
		file.write_all(format!("{}\n\n", ts_export::<Bookmark>()?).as_bytes())?;
		file.write_all(format!("{}\n\n", ts_export::<MediaAnnotation>()?).as_bytes())?;
		file.write_all(
			format!("{}\n\n", ts_export::<ActiveReadingSession>()?).as_bytes(),
		)?;
		file.write_all(
			format!("{}\n\n", ts_export::<FinishedReadingSession>()?).as_bytes(),
		)?;
		file.write_all(
			format!("{}\n\n", ts_export::<ProgressUpdateReturn>()?).as_bytes(),
		)?;
		file.write_all(format!("{}\n\n", ts_export::<PageDimension>()?).as_bytes())?;
		file.write_all(
			format!("{}\n\n", ts_export::<PageDimensionsEntity>()?).as_bytes(),
		)?;

		file.write_all(
			format!("{}\n\n", ts_export::<ReactTableColumnSort>()?).as_bytes(),
		)?;
		file.write_all(
			format!("{}\n\n", ts_export::<ReactTableGlobalSort>()?).as_bytes(),
		)?;

		file.write_all(format!("{}\n\n", ts_export::<Filter<()>>()?).as_bytes())?;
		file.write_all(format!("{}\n\n", ts_export::<NumericFilter<()>>()?).as_bytes())?;
		file.write_all(format!("{}\n\n", ts_export::<NumericRange<()>>()?).as_bytes())?;
		file.write_all(format!("{}\n\n", ts_export::<FilterGroup<()>>()?).as_bytes())?;
		file.write_all(format!("{}\n\n", ts_export::<FilterJoin>()?).as_bytes())?;
		file.write_all(
			format!("{}\n\n", ts_export::<SmartListItemGrouping>()?).as_bytes(),
		)?;
		file.write_all(
			format!("{}\n\n", ts_export::<SmartListItemGroup<()>>()?).as_bytes(),
		)?;
		file.write_all(format!("{}\n\n", ts_export::<SmartListItems>()?).as_bytes())?;
		file.write_all(format!("{}\n\n", ts_export::<SmartList>()?).as_bytes())?;
		file.write_all(format!("{}\n\n", ts_export::<SmartFilter<()>>()?).as_bytes())?;
		file.write_all(format!("{}\n\n", ts_export::<MediaSmartFilter>()?).as_bytes())?;
		file.write_all(
			format!("{}\n\n", ts_export::<MediaMetadataSmartFilter>()?).as_bytes(),
		)?;
		file.write_all(
			format!("{}\n\n", ts_export::<SeriesMetadataSmartFilter>()?).as_bytes(),
		)?;
		file.write_all(format!("{}\n\n", ts_export::<SeriesSmartFilter>()?).as_bytes())?;
		file.write_all(format!("{}\n\n", ts_export::<LibrarySmartFilter>()?).as_bytes())?;
		file.write_all(format!("{}\n\n", ts_export::<SmartListView>()?).as_bytes())?;

		file.write_all(format!("{}\n\n", ts_export::<BookClub>()?).as_bytes())?;
		file.write_all(format!("{}\n\n", ts_export::<BookClubMember>()?).as_bytes())?;
		file.write_all(format!("{}\n\n", ts_export::<BookClubMemberRole>()?).as_bytes())?;
		// TODO: https://github.com/oscartbeaumont/specta/issues/65 -> v2 stable will fix this
		// file.write_all(
		// 	format!("{}\n\n", ts_export::<BookClubMemberRoleSpec>()?).as_bytes(),
		// )?;
		file.write_all(
			format!(
				"{}\n\n",
				"export type BookClubMemberRoleSpec = Record<BookClubMemberRole, string>"
			)
			.as_bytes(),
		)?;
		file.write_all(format!("{}\n\n", ts_export::<BookClubSchedule>()?).as_bytes())?;
		file.write_all(
			format!("{}\n\n", ts_export::<BookClubExternalBook>()?).as_bytes(),
		)?;
		file.write_all(
			format!("{}\n\n", ts_export::<BookClubBookDetails>()?).as_bytes(),
		)?;
		file.write_all(format!("{}\n\n", ts_export::<BookClubBook>()?).as_bytes())?;
		file.write_all(format!("{}\n\n", ts_export::<BookClubDiscussion>()?).as_bytes())?;
		file.write_all(
			format!("{}\n\n", ts_export::<BookClubDiscussionMessage>()?).as_bytes(),
		)?;
		file.write_all(
			format!("{}\n\n", ts_export::<BookClubDiscussionMessageLike>()?).as_bytes(),
		)?;
		file.write_all(format!("{}\n\n", ts_export::<BookClubInvitation>()?).as_bytes())?;

		file.write_all(format!("{}\n\n", ts_export::<Tag>()?).as_bytes())?;
		file.write_all(format!("{}\n\n", ts_export::<LayoutMode>()?).as_bytes())?;

		file.write_all(format!("{}\n\n", ts_export::<Epub>()?).as_bytes())?;
		file.write_all(format!("{}\n\n", ts_export::<UpdateEpubProgress>()?).as_bytes())?;
		file.write_all(format!("{}\n\n", ts_export::<EpubContent>()?).as_bytes())?;

		file.write_all(format!("{}\n\n", ts_export::<JobStatus>()?).as_bytes())?;
		file.write_all(format!("{}\n\n", ts_export::<JobSchedulerConfig>()?).as_bytes())?;

		file.write_all(format!("{}\n\n", ts_export::<ReadingListItem>()?).as_bytes())?;
		file.write_all(
			format!("{}\n\n", ts_export::<ReadingListVisibility>()?).as_bytes(),
		)?;
		file.write_all(format!("{}\n\n", ts_export::<ReadingList>()?).as_bytes())?;
		file.write_all(format!("{}\n\n", ts_export::<CreateReadingList>()?).as_bytes())?;

		file.write_all(format!("{}\n\n", ts_export::<ImageResizeMode>()?).as_bytes())?;
		file.write_all(format!("{}\n\n", ts_export::<ImageResizeOptions>()?).as_bytes())?;
		file.write_all(format!("{}\n\n", ts_export::<ImageFormat>()?).as_bytes())?;
		file.write_all(
			format!("{}\n\n", ts_export::<ImageProcessorOptions>()?).as_bytes(),
		)?;

		file.write_all(format!("{}\n\n", ts_export::<DirectoryListing>()?).as_bytes())?;
		file.write_all(
			format!("{}\n\n", ts_export::<DirectoryListingFile>()?).as_bytes(),
		)?;
		file.write_all(
			format!("{}\n\n", ts_export::<DirectoryListingInput>()?).as_bytes(),
		)?;

		file.write_all(format!("{}\n\n", ts_export::<Direction>()?).as_bytes())?;
		file.write_all(format!("{}\n\n", ts_export::<PageParams>()?).as_bytes())?;
		file.write_all(format!("{}\n\n", ts_export::<QueryOrder>()?).as_bytes())?;
		file.write_all(format!("{}\n\n", ts_export::<PageQuery>()?).as_bytes())?;
		file.write_all(format!("{}\n\n", ts_export::<CursorQuery>()?).as_bytes())?;
		file.write_all(format!("{}\n\n", ts_export::<CursorInfo>()?).as_bytes())?;
		file.write_all(format!("{}\n\n", ts_export::<PageInfo>()?).as_bytes())?;
		file.write_all(format!("{}\n\n", ts_export::<Pagination>()?).as_bytes())?;

		Ok(())
	}
}
