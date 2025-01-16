use prisma_client_rust::chrono::{DateTime, FixedOffset};
use serde::{Deserialize, Serialize};
use specta::Type;
use utoipa::ToSchema;

use crate::{
	db::entity::macros::library_scan_details, prisma::library_scan_record, CoreError,
};

// TODO(granular-scans/metadata-merge): Support merge strategies for metadata at some point
/*
enum MergeStrategy {
   Replace,
   Merge,
   // A third option to record the difference to a table and allow the user to manually resolve conflicts? A bit complex! but would be neat. Prolly not viable.
}

let scan_options: ScanOptions = {
   merge_strategy: MergeStrategy::Replace,
   ..Default::default()
};

See also https://docs.rs/merge/latest/merge/ for potentially useful crate
*/

/// The override options for a scan job. These options are used to override the default behavior, which generally
/// means that the scanner will visit books it otherwise would not. How much extra work is done depends on the
/// specific options.
#[derive(Debug, Default, Clone, Deserialize, Serialize, Type, ToSchema, PartialEq)]
pub struct ScanOptions {
	/// Whether a scan should forcibly rebuild each book it visits and issue an update to the database.
	/// This is somewhat dangerous, as it can overwrite metadata which was manually set against the database
	/// and is not present in the book's metadata.
	#[serde(default)]
	force_rebuild: bool,
	/// Whether a scan should forcibly regenerate the hashes of each book it visits. This should be a no-op
	/// for books which have not been modified and have hashes already stored.
	#[serde(default)]
	regen_hashes: bool,
}

impl ScanOptions {
	pub fn is_default(&self) -> bool {
		*self == Self::default()
	}

	// TODO(granular-scans): This currently will trigger a full rebuild. This should be changed to actually use
	// the options. The changes for this are not in this file, but walk.rs and utils.rs
	/// Whether a scan should visit books which otherwise would not be visited (e.g., because they
	/// have not been updated since the last scan).
	pub fn should_visit_books(&self) -> bool {
		// If any of the options are set, we should visit books
		self.force_rebuild || self.regen_hashes
	}

	/// Whether a scan should perform a soft visit, which means that it will not forcibly rebuild
	/// the entire book from disk but focus on a few specific tasks (e.g., regenerating hashes).
	pub fn soft_visit(&self) -> bool {
		!self.force_rebuild && self.regen_hashes
	}
}

// TODO: move
#[derive(Debug, Clone, Deserialize, Serialize, Type, ToSchema)]
pub struct LibraryScanRecord {
	id: i32,
	options: Option<ScanOptions>,
	timestamp: DateTime<FixedOffset>,
	library_id: String,
}

impl TryFrom<library_scan_record::Data> for LibraryScanRecord {
	type Error = CoreError;

	fn try_from(data: library_scan_record::Data) -> Result<Self, Self::Error> {
		let options = data
			.options
			.map(|options| serde_json::from_slice(&options))
			.transpose()?;

		Ok(Self {
			id: data.id,
			options,
			timestamp: data.timestamp,
			library_id: data.library_id,
		})
	}
}

#[derive(Debug, Clone, Deserialize, Serialize, Type, ToSchema)]
pub struct LastLibraryScan {
	pub options: Option<ScanOptions>,
	pub timestamp: DateTime<FixedOffset>,
}

impl TryFrom<library_scan_details::scan_history::Data> for LastLibraryScan {
	type Error = CoreError;

	fn try_from(
		data: library_scan_details::scan_history::Data,
	) -> Result<Self, Self::Error> {
		let options = data
			.options
			.map(|options| serde_json::from_slice(&options))
			.transpose()?;

		Ok(Self {
			options,
			timestamp: data.timestamp,
		})
	}
}

#[cfg(test)]
mod tests {
	use super::*;

	#[test]
	fn should_visit_books_when_any_set() {
		let options = ScanOptions::default();
		assert!(!options.should_visit_books());

		let options = ScanOptions {
			regen_hashes: true,
			..ScanOptions::default()
		};
		assert!(options.should_visit_books());
	}

	#[test]
	fn should_deserialize() {
		let options = r#"{"regen_hashes":false}"#;
		let options: ScanOptions = serde_json::from_str(options).unwrap();
		assert!(!options.should_visit_books());
	}

	#[test]
	fn should_deserialize_empty() {
		let options = r#"{}"#;
		let options: ScanOptions = serde_json::from_str(options).unwrap();
		assert!(!options.should_visit_books());
	}
}
