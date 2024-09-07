#![warn(clippy::dbg_macro)]

mod google_books_client;
mod notifier;

pub use google_books_client::GoogleBooksClient;
pub use notifier::{DiscordClient, Notifier, TelegramClient};
