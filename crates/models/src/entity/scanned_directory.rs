use sea_orm::entity::prelude::*;

/// a last-seen `mtime` record for every directory visited during a library scan.
/// the idea here is that for subsequent scans, we can just check the mtime of directories
/// against the stored value and use that to skip unchanged subtrees
#[derive(Clone, Debug, PartialEq, Eq, DeriveEntityModel)]
#[sea_orm(table_name = "scanned_directories")]
pub struct Model {
	/// the absolute path to the directory
	#[sea_orm(primary_key, auto_increment = false, column_type = "Text")]
	pub path: String,
	/// the directory mtime at the time of last scan (seconds since epoch)
	pub last_mtime: i64,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}
