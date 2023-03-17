use std::sync::Arc;

use axum::extract::State;
use axum_macros::FromRequestParts;
use stump_core::prelude::Ctx;

// TODO: I don't feel like I need this module... Unless I add things to it..
pub type AppState = Arc<Ctx>;

// TODO: is this how to fix the FIXME note in auth extractor?
#[derive(FromRequestParts, Clone)]
pub struct _AppState {
	#[allow(unused)]
	core_ctx: State<AppState>,
}
