#![warn(clippy::dbg_macro)]

rust_i18n::i18n!("../../packages/i18n/src/locales", fallback = "en-US");

pub mod config;
pub mod errors;
pub mod http_server;
pub mod middleware;
pub mod routers;
pub mod utils;

pub use http_server::{bootstrap_http_server_config, run_http_server};
