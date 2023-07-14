mod batch_scanner;
mod common;
mod setup;
mod sync_scanner;
mod utils;

use crate::{db::entity::LibraryScanMode, error::CoreResult, job::runner::RunnerCtx};

pub async fn scan(
	ctx: RunnerCtx,
	path: String,
	runner_id: String,
	scan_mode: LibraryScanMode,
) -> CoreResult<u64> {
	match scan_mode {
		LibraryScanMode::Batched => batch_scanner::scan(ctx, path, runner_id).await,
		LibraryScanMode::Sync => sync_scanner::scan(ctx, path, runner_id).await,
		_ => unreachable!("A job should not have reached this point if the scan mode is not batch or sync."),
	}
}
