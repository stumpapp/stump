use std::path::PathBuf;

use prisma_client_rust::chrono::{DateTime, FixedOffset};
use serde::{Deserialize, Serialize};
use specta::Type;
use utoipa::ToSchema;

use crate::{
	db::entity::{macros::library_scan_details, Media, MediaMetadata},
	filesystem::ProcessedFileHashes,
	prisma::library_scan_record,
	CoreError,
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

#[derive(Debug, Default, Clone, Deserialize, Serialize, Type, ToSchema, PartialEq)]
pub enum VisitStrategy {
	/// Rebuild books that have changed on disk since the last scan
	#[default]
	#[serde(rename = "rebuild_changed")]
	RebuildChanged,
	/// Rebuild all books, regardless of whether they have changed on disk. This
	/// will update metadata, hashes, etc.
	#[serde(rename = "rebuild_all")]
	RebuildAll,
	/// Regenerate metadata for all books, regardless of whether they have changed on disk.
	#[serde(rename = "regen_meta")]
	RegenMeta,
	/// Regenerate hashes for all books, regardless of whether they have changed on disk.
	#[serde(rename = "regen_hashes")]
	RegenHashes,
}

#[derive(Debug, Clone, PartialEq)]
pub enum BookVisitOperation {
	Rebuild,
	RegenMeta,
	RegenHashes,
}

pub struct BookVisitCtx {
	pub operation: BookVisitOperation,
	pub path: PathBuf,
	pub series_id: String,
	pub existing_book: Option<Media>,
}

pub enum BookVisitResult {
	Built(Box<Media>),
	RegeneratedMeta {
		id: String,
		meta: Box<MediaMetadata>,
	},
	RegeneratedHashes {
		id: String,
		hashes: ProcessedFileHashes,
	},
}

/// The override options for a scan job. These options are used to override the default behavior, which generally
/// means that the scanner will visit books it otherwise would not. How much extra work is done depends on the
/// specific options.
#[derive(Debug, Default, Clone, Deserialize, Serialize, Type, ToSchema, PartialEq)]
pub struct ScanOptions {
	#[serde(default)]
	pub visit_strategy: VisitStrategy,
}

impl ScanOptions {
	pub fn is_default(&self) -> bool {
		matches!(self.visit_strategy, VisitStrategy::RebuildChanged)
	}

	/// Returns a [BookVisitOperation] if one can be naively inferred from the visit strategy.
	/// If the operation cannot be inferred, i.e. if the strategy is dependent on more context like
	/// the modified time of the book, this method will return None.
	pub fn book_operation(&self) -> Option<BookVisitOperation> {
		match self.visit_strategy {
			VisitStrategy::RebuildAll => Some(BookVisitOperation::Rebuild),
			VisitStrategy::RegenMeta => Some(BookVisitOperation::RegenMeta),
			VisitStrategy::RegenHashes => Some(BookVisitOperation::RegenHashes),
			// RebuildChanged requires more context to determine the operation
			_ => None,
		}
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
	fn test_properly_converts_to_book_operation() {
		let options = ScanOptions::default();
		assert_eq!(options.book_operation(), None);

		let options = ScanOptions {
			visit_strategy: VisitStrategy::RebuildAll,
		};
		assert_eq!(options.book_operation(), Some(BookVisitOperation::Rebuild));

		let options = ScanOptions {
			visit_strategy: VisitStrategy::RegenMeta,
		};
		assert_eq!(
			options.book_operation(),
			Some(BookVisitOperation::RegenMeta)
		);

		let options = ScanOptions {
			visit_strategy: VisitStrategy::RegenHashes,
		};
		assert_eq!(
			options.book_operation(),
			Some(BookVisitOperation::RegenHashes)
		);
	}

	#[test]
	fn test_deserialize() {
		assert_eq!(
			serde_json::from_str::<ScanOptions>(r#"{"visit_strategy":"rebuild_all"}"#)
				.unwrap()
				.visit_strategy,
			VisitStrategy::RebuildAll
		);
		assert_eq!(
			serde_json::from_str::<ScanOptions>(r#"{"visit_strategy":"regen_meta"}"#)
				.unwrap()
				.visit_strategy,
			VisitStrategy::RegenMeta
		);
		assert_eq!(
			serde_json::from_str::<ScanOptions>(r#"{"visit_strategy":"regen_hashes"}"#)
				.unwrap()
				.visit_strategy,
			VisitStrategy::RegenHashes
		);
		assert_eq!(
			serde_json::from_str::<ScanOptions>(
				r#"{"visit_strategy":"rebuild_changed"}"#
			)
			.unwrap()
			.visit_strategy,
			VisitStrategy::RebuildChanged
		);
	}

	#[test]
	fn test_deserialize_empty() {
		let options = r#"{}"#;
		let options: ScanOptions = serde_json::from_str(options).unwrap();
		assert!(options.is_default());
	}
}
