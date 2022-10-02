use std::sync::Arc;

use axum::Extension;
use stump_core::config::Ctx;

// TODO: I don't feel like I need this module... Unless I add things to it..

pub type State = Extension<Arc<Ctx>>;
