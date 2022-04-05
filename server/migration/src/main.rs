use std::path::PathBuf;

use migration::Migrator;
use sea_schema::migration::prelude::*;

#[cfg(debug_assertions)]
use dotenv::dotenv;

fn home_dir() -> PathBuf {
    dirs::home_dir().expect("Could not find home directory")
}

#[async_std::main]
async fn main() {
    #[cfg(debug_assertions)]
    dotenv().ok();

    let config_dir = match std::env::var("STUMP_CONFIG_DIR") {
        Ok(val) => PathBuf::from(val),
        Err(_) => home_dir(),
    };

    std::fs::create_dir_all(&config_dir).expect("Could not create config directory");

    let database_url = format!(
        "sqlite:{}?mode=rwc",
        config_dir.join("stump.db").to_str().unwrap()
    );

    std::env::set_var("DATABASE_URL", database_url);

    cli::run_cli(Migrator).await;
}
