use serde::{Deserialize, Serialize};

use crate::filesystem::media::{BuiltMedia, ProcessedFileHashes, ProcessedMediaMetadata};

#[derive(Debug, Default, Clone, Copy, Deserialize, Serialize, PartialEq)]
#[serde(default)]
pub struct CustomVisit {
	pub regen_meta: bool,
	pub regen_hashes: bool,
}

impl CustomVisit {
	pub fn is_useless(&self) -> bool {
		!self.regen_meta && !self.regen_hashes
	}
}

#[derive(Debug, Clone, Copy, Deserialize, Serialize, PartialEq)]
pub enum BookVisitOperation {
	Rebuild,
	Custom(CustomVisit),
}

/// The result of a custom visit operation. This stores the generated bits of a book that
/// were targeted by the visit operation.
#[derive(Default)]
pub struct CustomVisitResult {
	/// The ID of the book that was visited
	pub id: String,
	/// The metadata that was generated during the visit, if any
	pub meta: Option<Box<ProcessedMediaMetadata>>,
	/// The hashes that were generated during the visit, if any
	pub hashes: Option<ProcessedFileHashes>,
}

pub enum BookVisitResult {
	Built(Box<BuiltMedia>),
	Custom(CustomVisitResult),
}

impl BookVisitResult {
	/// Returns the context of the error that occurred during the visit. This will either be
	/// the path to or the ID of the book.
	pub fn error_ctx(&self) -> String {
		match self {
			BookVisitResult::Built(result) => {
				match result.media.path.clone().into_value() {
					Some(sea_orm::Value::String(Some(s))) => *s,
					_ => {
						tracing::warn!(?result, "Processed media has invalid path?");
						String::default()
					},
				}
			},
			BookVisitResult::Custom(result) => result.id.clone(),
		}
	}
}

/// The override options for a scan job. These options are used to override the default behavior, which generally
/// means that the scanner will visit books it otherwise would not. How much extra work is done depends on the
/// specific options.
#[derive(Debug, Default, Clone, Copy, Deserialize, Serialize)]
pub struct ScanOptions {
	#[serde(default)]
	pub config: ScanConfig,
}

#[derive(Default, Debug, Clone, Copy, Deserialize, Serialize)]
#[serde(untagged)]
pub enum ScanConfig {
	#[default]
	BuildChanged,
	ForceRebuild {
		force_rebuild: bool,
	},
	Custom(CustomVisit),
}

impl ScanConfig {
	pub fn is_useless(&self) -> bool {
		match self {
			ScanConfig::BuildChanged => true,
			ScanConfig::ForceRebuild { force_rebuild } => !*force_rebuild,
			ScanConfig::Custom(custom) => custom.is_useless(),
		}
	}
}

impl ScanOptions {
	pub fn is_default(&self) -> bool {
		matches!(self.config, ScanConfig::BuildChanged) || self.config.is_useless()
	}

	/// Returns a [BookVisitOperation] if one can be naively inferred from the visit strategy.
	/// If the operation cannot be inferred, i.e. if the strategy is dependent on more context like
	/// the modified time of the book, this method will return None.
	pub fn book_operation(&self) -> Option<BookVisitOperation> {
		match self.config {
			// We cannot infer the operation from this strategy since it depends on the modified
			// time of the book. So we return None.
			ScanConfig::BuildChanged => None,
			ScanConfig::ForceRebuild { force_rebuild } if force_rebuild => {
				Some(BookVisitOperation::Rebuild)
			},
			ScanConfig::Custom(custom) if !custom.is_useless() => {
				Some(BookVisitOperation::Custom(custom))
			},
			_ => None,
		}
	}
}

#[cfg(test)]
mod tests {

	use models::entity::media;
	use sea_orm::ActiveValue;

	use super::*;

	#[test]
	fn test_properly_converts_to_book_operation() {
		let options = ScanOptions::default();
		assert_eq!(options.book_operation(), None);

		let options = ScanOptions {
			config: ScanConfig::BuildChanged,
		};
		assert_eq!(options.book_operation(), None);

		let options = ScanOptions {
			config: ScanConfig::ForceRebuild {
				force_rebuild: true,
			},
		};
		assert_eq!(options.book_operation(), Some(BookVisitOperation::Rebuild));

		let options = ScanOptions {
			config: ScanConfig::Custom(CustomVisit {
				regen_meta: true,
				regen_hashes: false,
			}),
		};
		assert_eq!(
			options.book_operation(),
			Some(BookVisitOperation::Custom(CustomVisit {
				regen_meta: true,
				regen_hashes: false
			}))
		);
	}

	#[test]
	fn test_error_ctx() {
		let book = BuiltMedia {
			media: media::ActiveModel {
				id: ActiveValue::Set("book".to_string()),
				path: ActiveValue::Set("path".to_string()),
				..Default::default()
			},
			metadata: None,
		};

		let result = BookVisitResult::Built(Box::new(book.clone()));
		assert_eq!(result.error_ctx(), "path".to_string());

		let result = BookVisitResult::Custom(CustomVisitResult {
			id: "book".to_string(),
			meta: None,
			hashes: None,
		});
		assert_eq!(result.error_ctx(), "book".to_string());

		let result = BookVisitResult::Custom(CustomVisitResult {
			id: "book".to_string(),
			meta: None,
			hashes: None,
		});
		assert_eq!(result.error_ctx(), "book".to_string());
	}

	#[test]
	fn test_serialize_scan_options() {
		assert_eq!(
			serde_json::to_string(&ScanOptions {
				config: ScanConfig::ForceRebuild {
					force_rebuild: true
				}
			})
			.unwrap(),
			r#"{"config":{"force_rebuild":true}}"#
		);

		assert_eq!(
			serde_json::to_string(&ScanOptions {
				config: ScanConfig::ForceRebuild {
					force_rebuild: false
				}
			})
			.unwrap(),
			r#"{"config":{"force_rebuild":false}}"#
		);

		assert_eq!(
			serde_json::to_string(&ScanOptions {
				config: ScanConfig::Custom(CustomVisit {
					regen_meta: true,
					regen_hashes: false
				})
			})
			.unwrap(),
			r#"{"config":{"regen_meta":true,"regen_hashes":false}}"#
		);

		assert_eq!(
			serde_json::to_string(&ScanOptions {
				config: ScanConfig::Custom(CustomVisit {
					regen_meta: false,
					regen_hashes: true
				})
			})
			.unwrap(),
			r#"{"config":{"regen_meta":false,"regen_hashes":true}}"#
		);

		assert_eq!(
			serde_json::to_string(&ScanOptions {
				config: ScanConfig::Custom(CustomVisit {
					regen_meta: true,
					regen_hashes: true
				})
			})
			.unwrap(),
			r#"{"config":{"regen_meta":true,"regen_hashes":true}}"#
		);
	}

	#[test]
	fn test_deserialize_scan_options() {
		assert!(matches!(
			serde_json::from_str::<ScanOptions>(r#"{"config":{"force_rebuild":true}}"#)
				.unwrap()
				.config,
			ScanConfig::ForceRebuild {
				force_rebuild: true
			}
		));

		assert!(matches!(
			serde_json::from_str::<ScanOptions>(r#"{"config":{"force_rebuild":false}}"#)
				.unwrap()
				.config,
			ScanConfig::ForceRebuild {
				force_rebuild: false
			}
		));

		assert!(matches!(
			serde_json::from_str::<ScanOptions>(r#"{"config":{"regen_meta":true}}"#)
				.unwrap()
				.config,
			ScanConfig::Custom(CustomVisit {
				regen_meta: true,
				regen_hashes: false
			})
		));

		assert!(matches!(
			serde_json::from_str::<ScanOptions>(r#"{"config":{"regen_hashes":true}}"#)
				.unwrap()
				.config,
			ScanConfig::Custom(CustomVisit {
				regen_meta: false,
				regen_hashes: true
			})
		));

		assert!(matches!(
			serde_json::from_str::<ScanOptions>(
				r#"{"config":{"regen_meta":true,"regen_hashes":true}}"#
			)
			.unwrap()
			.config,
			ScanConfig::Custom(CustomVisit {
				regen_meta: true,
				regen_hashes: true
			})
		));
	}

	#[test]
	fn test_no_useless_operations() {
		let options = ScanOptions::default();
		assert!(options.is_default());
		assert!(options.book_operation().is_none());

		let options = ScanOptions {
			config: ScanConfig::ForceRebuild {
				force_rebuild: false,
			},
		};
		assert!(options.is_default());
		assert!(options.book_operation().is_none());

		let options = ScanOptions {
			config: ScanConfig::Custom(CustomVisit {
				regen_meta: false,
				regen_hashes: false,
			}),
		};
		assert!(options.config.is_useless());
		assert!(options.book_operation().is_none());

		let options = ScanOptions {
			config: ScanConfig::Custom(CustomVisit {
				regen_meta: true,
				regen_hashes: false,
			}),
		};
		assert!(!options.config.is_useless());

		let options = ScanOptions {
			config: ScanConfig::Custom(CustomVisit {
				regen_meta: false,
				regen_hashes: true,
			}),
		};
		assert!(!options.config.is_useless());

		let options = ScanOptions {
			config: ScanConfig::BuildChanged,
		};
		assert!(options.book_operation().is_none());
		assert!(options.is_default());
		assert!(options.config.is_useless());
	}

	#[test]
	fn test_deserialize_default() {
		let options = r#"{}"#;
		let options: ScanOptions = serde_json::from_str(options).unwrap();
		assert!(options.is_default());
		let options = r#"{"config": null}"#;
		let options: ScanOptions = serde_json::from_str(options).unwrap();
		assert!(options.is_default());
	}
}
