// This was added as a fix for https://github.com/stumpapp/stump/issues/146
// I am not entirely sure why this issue cropped up all of the sudden, but
// this seems to resolve it in a musl environment.
#![recursion_limit = "256"]
#![warn(clippy::dbg_macro)]

use std::sync::Arc;

// TODO: for these crates, some should NOT hoist entire crate, I need to restrict it
// to only what is necessary... UGH.

pub mod config;
pub mod db;
pub mod event;
pub mod filesystem;
pub mod job;
pub mod job_;
mod job__;
pub mod opds;

mod context;
pub mod error;

#[allow(warnings, unused)]
pub mod prisma;

use config::logging::STUMP_SHADOW_TEXT;
use config::StumpConfig;
use db::{DBPragma, JournalMode};
use event::{event_manager::EventManager, InternalCoreTask};
use job::JobScheduler;
use prisma::server_config;
use tokio::sync::mpsc::unbounded_channel;

pub use context::Ctx;
pub use error::{CoreError, CoreResult};

/// A type alias strictly for explicitness in the return type of `init_journal_mode`.
type JournalModeChanged = bool;

/// The [StumpCore] struct is the main entry point for any server-side Stump
/// applications. It is responsible for managing incoming tasks ([InternalCoreTask]),
/// outgoing events ([CoreEvent](event::CoreEvent)), and providing access to the database
/// via the core's [Ctx].
///
/// [StumpCore] expects the consuming application to determine its configuration prior to startup.
/// [config::bootstrap_config_dir] enables consumers to fetch the configuration directory automatically,
/// and [StumpCore::init_config](#method.init_config) will load any Stump.toml in the config directory
/// or environment variables to return a [StumpConfig] struct.
///
/// ## Example:
/// ```rust
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
	event_manager: Arc<EventManager>,
}

impl StumpCore {
	/// Creates a new instance of [`StumpCore`] and returns it wrapped in an [`Arc`].
	pub async fn new(config: StumpConfig) -> StumpCore {
		let internal_channel = unbounded_channel::<InternalCoreTask>();

		let core_ctx = Ctx::new(config, internal_channel.0).await;
		let event_manager = EventManager::new(core_ctx.clone(), internal_channel.1);

		StumpCore {
			ctx: core_ctx,
			event_manager,
		}
	}

	/// A three-step configuration initialization function.
	///
	/// 1. Loads configuration variables from Stump.toml, located at the input
	/// config_dir, if such a file exists.
	///
	/// 2. Overrides variables with those set in the environment.
	///
	/// 3. Creates the configuration directory (if it does not exist) and writes
	/// to Stump.toml.
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
	/// prividing access to the database and internal channels.
	pub fn get_context(&self) -> Ctx {
		self.ctx.clone()
	}

	pub fn get_job_manager(&self) -> Arc<job::JobManager> {
		self.event_manager.get_job_manager()
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

			if journal_mode != JournalMode::WAL {
				tracing::trace!("Journal mode is not set to WAL!");
				let updated_journal_mode =
					client.set_journal_mode(JournalMode::WAL).await?;
				tracing::debug!(
					"Initial journal mode has been set to {:?}",
					updated_journal_mode
				)
			} else {
				tracing::trace!("Journal mode is already set to WAL, skipping");
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
		event::*,
		filesystem::{image::*, *},
		job::*,
	};

	#[allow(dead_code)]
	fn ts_export<T>() -> Result<String, TsExportError>
	where
		T: NamedType,
	{
		export::<T>(&ExportConfiguration::new().bigint(BigIntExportBehavior::BigInt))
	}

	#[test]
	#[ignore]
	fn codegen() -> Result<(), Box<dyn std::error::Error>> {
		let path = PathBuf::from(env!("CARGO_MANIFEST_DIR"))
			.join("../packages/types")
			.join("generated.ts");

		println!(
			"Please ensure to only generate types using `cargo run --package codegen`"
		);

		let mut file = File::create(path)?;

		file.write_all(b"/* eslint-disable @typescript-eslint/ban-types */\n")?;
		file.write_all(b"// DO NOT MODIFY THIS FILE, IT IS AUTOGENERATED\n\n")?;

		file.write_all(b"// CORE TYPE GENERATION\n\n")?;

		file.write_all(format!("{}\n\n", ts_export::<EntityVisibility>()?).as_bytes())?;
		file.write_all(format!("{}\n\n", ts_export::<AccessRole>()?).as_bytes())?;

		file.write_all(format!("{}\n\n", ts_export::<User>()?).as_bytes())?;
		file.write_all(format!("{}\n\n", ts_export::<UserPermission>()?).as_bytes())?;
		file.write_all(format!("{}\n\n", ts_export::<AgeRestriction>()?).as_bytes())?;
		file.write_all(format!("{}\n\n", ts_export::<UserPreferences>()?).as_bytes())?;
		file.write_all(format!("{}\n\n", ts_export::<LoginActivity>()?).as_bytes())?;

		file.write_all(format!("{}\n\n", ts_export::<FileStatus>()?).as_bytes())?;
		file.write_all(format!("{}\n\n", ts_export::<Library>()?).as_bytes())?;
		file.write_all(format!("{}\n\n", ts_export::<LibraryPattern>()?).as_bytes())?;
		file.write_all(format!("{}\n\n", ts_export::<LibraryScanMode>()?).as_bytes())?;
		file.write_all(format!("{}\n\n", ts_export::<LibraryOptions>()?).as_bytes())?;
		file.write_all(format!("{}\n\n", ts_export::<LibrariesStats>()?).as_bytes())?;

		file.write_all(format!("{}\n\n", ts_export::<SeriesMetadata>()?).as_bytes())?;
		file.write_all(format!("{}\n\n", ts_export::<Series>()?).as_bytes())?;
		file.write_all(format!("{}\n\n", ts_export::<MediaMetadata>()?).as_bytes())?;
		file.write_all(format!("{}\n\n", ts_export::<Media>()?).as_bytes())?;
		file.write_all(format!("{}\n\n", ts_export::<Bookmark>()?).as_bytes())?;
		file.write_all(format!("{}\n\n", ts_export::<MediaAnnotation>()?).as_bytes())?;
		file.write_all(format!("{}\n\n", ts_export::<ReadProgress>()?).as_bytes())?;

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
		file.write_all(
			format!("{}\n\n", ts_export::<SmartListTableSortingState>()?).as_bytes(),
		)?;
		file.write_all(
			format!("{}\n\n", ts_export::<SmartListTableColumnSelection>()?).as_bytes(),
		)?;

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
		file.write_all(format!("{}\n\n", ts_export::<BookClubBook>()?).as_bytes())?;
		file.write_all(format!("{}\n\n", ts_export::<BookClubChatBoard>()?).as_bytes())?;
		file.write_all(
			format!("{}\n\n", ts_export::<BookClubChatMessage>()?).as_bytes(),
		)?;
		file.write_all(
			format!("{}\n\n", ts_export::<BookClubChatMessageLike>()?).as_bytes(),
		)?;
		file.write_all(format!("{}\n\n", ts_export::<BookClubInvitation>()?).as_bytes())?;

		file.write_all(format!("{}\n\n", ts_export::<Tag>()?).as_bytes())?;
		file.write_all(format!("{}\n\n", ts_export::<LayoutMode>()?).as_bytes())?;

		file.write_all(format!("{}\n\n", ts_export::<Epub>()?).as_bytes())?;
		file.write_all(format!("{}\n\n", ts_export::<UpdateEpubProgress>()?).as_bytes())?;
		file.write_all(format!("{}\n\n", ts_export::<EpubContent>()?).as_bytes())?;

		file.write_all(format!("{}\n\n", ts_export::<JobStatus>()?).as_bytes())?;
		file.write_all(format!("{}\n\n", ts_export::<JobUpdate>()?).as_bytes())?;
		file.write_all(format!("{}\n\n", ts_export::<JobDetail>()?).as_bytes())?;
		file.write_all(format!("{}\n\n", ts_export::<JobSchedulerConfig>()?).as_bytes())?;

		file.write_all(format!("{}\n\n", ts_export::<CoreEvent>()?).as_bytes())?;

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

		file.write_all(format!("{}\n\n", ts_export::<Log>()?).as_bytes())?;
		file.write_all(format!("{}\n\n", ts_export::<LogMetadata>()?).as_bytes())?;
		file.write_all(format!("{}\n\n", ts_export::<LogLevel>()?).as_bytes())?;

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
