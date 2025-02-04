#![warn(clippy::dbg_macro)]

//TODO(jmicheli) Reorganize this crate to signal its purpose better. It should probably be called "notifiers" and not have a submodule of the same name.

mod notifier;

pub use notifier::{DiscordClient, Notifier, TelegramClient};
