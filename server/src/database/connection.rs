use std::path::PathBuf;

use anyhow::Result;
use sea_orm::{Database, DatabaseConnection};

fn create_app_folder() -> Result<PathBuf> {
    let home_dir = dirs::home_dir().ok_or(anyhow::anyhow!("Could not find home directory"))?;
    let db_dir = home_dir.join(".stump");
    std::fs::create_dir_all(&db_dir)?;
    Ok(db_dir)
}

fn create_db_file() -> Result<String> {
    let app_folder = create_app_folder()?;

    let db_file = format!(
        "sqlite:{}?mode=rwc",
        app_folder.join("stump.db").to_str().unwrap()
    );

    Ok(db_file)
}

pub async fn create_connection() -> Result<DatabaseConnection> {
    let db_file = create_db_file()?;

    Ok(Database::connect(db_file).await?)
}
