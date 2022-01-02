use sea_orm::DatabaseConnection;

use crate::database::entities::library;

/// This function will scan the filesystem at the given starting points (ie: the user-defined media directories)
/// and return a number of new media files found. New media files are added to the database.
pub fn scan(db: &DatabaseConnection, media_dirs: Vec<library::Model>) -> usize {
    0
}
