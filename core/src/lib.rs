#[macro_use]
extern crate rocket;

use std::sync::Arc;

// TODO: for these crates, some should NOT hoist entire crate, I need to restrict it
// to only what is necessary...

pub mod config;
pub mod db;
pub mod event;
pub mod fs;
pub mod job;
pub mod opds;

pub mod prisma;
pub mod types;

use config::context::Ctx;
use config::logging::STUMP_SHADOW_TEXT;
use config::{env::StumpEnv, logging::init_fern};
use event::{event_manager::EventManager, InternalCoreTask};
use rocket::tokio::sync::mpsc::unbounded_channel;
use types::{errors::CoreError, CoreResult};

pub struct StumpCore {
	ctx: Ctx,
	#[allow(dead_code)]
	event_manager: Arc<EventManager>,
}

impl StumpCore {
	pub async fn new() -> Arc<StumpCore> {
		let internal_channel = unbounded_channel::<InternalCoreTask>();

		let core_ctx = Ctx::new(internal_channel.0).await;

		let event_manager = EventManager::new(core_ctx.get_ctx(), internal_channel.1);

		let core = Self {
			ctx: core_ctx,
			event_manager,
		};

		Arc::new(core)
	}

	pub fn init_logging() -> Result<(), fern::InitError> {
		init_fern()
	}

	pub fn load_env() -> CoreResult<()> {
		StumpEnv::load()
	}

	pub fn get_context(&self) -> Ctx {
		self.ctx.get_ctx()
	}

	pub fn get_shadow_text(&self) -> &str {
		return STUMP_SHADOW_TEXT;
	}

	pub async fn run_migrations(
		&self,
		db: &prisma::PrismaClient,
	) -> Result<(), CoreError> {
		db::migration::run_migrations(db).await
	}
}
