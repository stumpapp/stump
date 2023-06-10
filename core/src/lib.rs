use std::sync::Arc;

// TODO: for these crates, some should NOT hoist entire crate, I need to restrict it
// to only what is necessary... UGH.

pub mod config;
pub mod db;
pub mod event;
pub mod filesystem;
pub mod job;
pub mod opds;

mod context;
pub mod error;
pub mod prisma;

use config::env::StumpEnvironment;
use config::logging::STUMP_SHADOW_TEXT;
use event::{event_manager::EventManager, InternalCoreTask};
use tokio::sync::mpsc::unbounded_channel;

pub use context::Ctx;
pub use error::{CoreError, CoreResult};

/// The [`StumpCore`] struct is the main entry point for any server-side Stump
/// applications. It is responsible for managing incoming tasks ([`InternalCoreTask`]),
/// outgoing events ([`CoreEvent`](event::CoreEvent)), and providing access to the database
/// via the core's [`Ctx`].
///
/// [`StumpCore`] also provides a few initilization functions, such as `init_environment`. This
/// is provided to standardize various configurations for consumers of the library.
///
/// ## Example:
/// ```rust
/// use stump_core::StumpCore;
///
/// #[tokio::main]
/// async fn main() {
///    assert!(StumpCore::init_environment().is_ok());
///
///    let core = StumpCore::new().await;
///    // do stuff with core
/// }
/// ```
pub struct StumpCore {
	ctx: Ctx,
	#[allow(dead_code)]
	event_manager: Arc<EventManager>,
}

impl StumpCore {
	/// Creates a new instance of [`StumpCore`] and returns it wrapped in an [`Arc`].
	pub async fn new() -> StumpCore {
		let internal_channel = unbounded_channel::<InternalCoreTask>();

		let core_ctx = Ctx::new(internal_channel.0).await;
		let event_manager = EventManager::new(core_ctx.get_ctx(), internal_channel.1);

		StumpCore {
			ctx: core_ctx,
			event_manager,
		}
	}

	/// Loads environment variables from the `Stump.toml` configuration file, if
	/// it exists, using the [`StumpEnv`] struct.
	pub fn init_environment() -> CoreResult<StumpEnvironment> {
		StumpEnvironment::load()
	}

	/// Returns [`StumpCore`] wrapped in an [`Arc`]. Will take ownership of self. Created
	/// for convenience if ever needed to create an instance without using the `new` method.
	pub fn arced(self) -> Arc<Self> {
		Arc::new(self)
	}

	/// Returns a new instance of [`Ctx`]. This is the main context struct for the core,
	/// prividing access to the database and internal channels.
	pub fn get_context(&self) -> Ctx {
		self.ctx.get_ctx()
	}

	/// Returns the shadow text for the core. This is just the fun ascii art that
	/// is printed to the console when the server starts.
	pub fn get_shadow_text(&self) -> &str {
		STUMP_SHADOW_TEXT
	}

	/// Runs the database migrations. This will be updated with PCR 0.6.2
	pub async fn run_migrations(&self) -> Result<(), CoreError> {
		db::migration::run_migrations(&self.ctx.db).await
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
			entity::{
				epub::*, library::*, log::*, media::*, metadata::*, read_progress::*,
				reading_list::*, series::*, tag::*, user::*, FileStatus, LayoutMode,
			},
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
		let mut file = File::create(
			PathBuf::from(env!("CARGO_MANIFEST_DIR"))
				.join("../packages/types")
				.join("core.ts"),
		)?;

		file.write_all(b"/* eslint-disable @typescript-eslint/ban-types */\n")?;
		file.write_all(b"// DO NOT MODIFY THIS FILE, IT IS AUTOGENERATED\n\n")?;

		file.write_all(format!("{}\n\n", ts_export::<User>()?).as_bytes())?;
		file.write_all(format!("{}\n\n", ts_export::<UserRole>()?).as_bytes())?;
		file.write_all(format!("{}\n\n", ts_export::<UserPreferences>()?).as_bytes())?;
		file.write_all(format!("{}\n\n", ts_export::<UpdateUser>()?).as_bytes())?;
		file.write_all(
			format!("{}\n\n", ts_export::<UpdateUserPreferences>()?).as_bytes(),
		)?;

		file.write_all(format!("{}\n\n", ts_export::<FileStatus>()?).as_bytes())?;
		file.write_all(format!("{}\n\n", ts_export::<Library>()?).as_bytes())?;
		file.write_all(format!("{}\n\n", ts_export::<LibraryPattern>()?).as_bytes())?;
		file.write_all(format!("{}\n\n", ts_export::<LibraryScanMode>()?).as_bytes())?;
		file.write_all(format!("{}\n\n", ts_export::<LibraryOptions>()?).as_bytes())?;
		file.write_all(format!("{}\n\n", ts_export::<CreateLibrary>()?).as_bytes())?;
		file.write_all(format!("{}\n\n", ts_export::<UpdateLibrary>()?).as_bytes())?;
		file.write_all(format!("{}\n\n", ts_export::<LibrariesStats>()?).as_bytes())?;

		file.write_all(format!("{}\n\n", ts_export::<SeriesMetadata>()?).as_bytes())?;
		file.write_all(format!("{}\n\n", ts_export::<Series>()?).as_bytes())?;
		file.write_all(format!("{}\n\n", ts_export::<MediaMetadata>()?).as_bytes())?;
		file.write_all(format!("{}\n\n", ts_export::<Media>()?).as_bytes())?;
		file.write_all(
			format!("{}\n\n", ts_export::<MediaAnnotationKind>()?).as_bytes(),
		)?;
		file.write_all(format!("{}\n\n", ts_export::<MediaAnnotation>()?).as_bytes())?;
		// file.write_all(format!("{}\n\n", ts_export::<MediaMetadata>()?).as_bytes())?;
		file.write_all(format!("{}\n\n", ts_export::<ReadProgress>()?).as_bytes())?;
		file.write_all(format!("{}\n\n", ts_export::<Tag>()?).as_bytes())?;
		file.write_all(format!("{}\n\n", ts_export::<LayoutMode>()?).as_bytes())?;

		file.write_all(format!("{}\n\n", ts_export::<Epub>()?).as_bytes())?;
		file.write_all(format!("{}\n\n", ts_export::<UpdateEpubProgress>()?).as_bytes())?;
		file.write_all(format!("{}\n\n", ts_export::<EpubContent>()?).as_bytes())?;

		file.write_all(format!("{}\n\n", ts_export::<JobStatus>()?).as_bytes())?;
		file.write_all(format!("{}\n\n", ts_export::<JobUpdate>()?).as_bytes())?;
		file.write_all(format!("{}\n\n", ts_export::<JobReport>()?).as_bytes())?;
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
		// Note: this will essentially be Partial<PageParams>...
		file.write_all(format!("{}\n\n", ts_export::<QueryOrder>()?).as_bytes())?;
		file.write_all(format!("{}\n\n", ts_export::<PageQuery>()?).as_bytes())?;
		file.write_all(format!("{}\n\n", ts_export::<CursorQuery>()?).as_bytes())?;
		file.write_all(format!("{}\n\n", ts_export::<CursorInfo>()?).as_bytes())?;
		file.write_all(format!("{}\n\n", ts_export::<PageInfo>()?).as_bytes())?;
		file.write_all(format!("{}\n\n", ts_export::<Pagination>()?).as_bytes())?;
		// file.write_all(format!("{}\n\n", ts_export::<Pageable>()?).as_bytes())?; // TODO: figure this out

		Ok(())
	}
}
