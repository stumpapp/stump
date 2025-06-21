use async_graphql::{ComplexObject, Json, SimpleObject};

use models::entity::library_scan_record;
use stump_core::filesystem::scanner::ScanOptions;

#[derive(Debug, SimpleObject)]
#[graphql(complex)]
pub struct LibraryScanRecord {
	#[graphql(flatten)]
	pub model: library_scan_record::Model,
}

impl From<library_scan_record::Model> for LibraryScanRecord {
	fn from(model: library_scan_record::Model) -> Self {
		Self { model }
	}
}

#[ComplexObject]
impl LibraryScanRecord {
	// TODO(graphql): Investigate not using a JSON wrapper for this. async_graphql doesn't support
	// non-unit enums, so it might just be a limitation. It does degrate the DX a bit missing
	// out on the types.
	async fn options(&self) -> Option<Json<ScanOptions>> {
		match &self.model.options {
			Some(options) => {
				let parsed = serde_json::from_slice(options.as_ref())
					.map_err(|error| {
						tracing::error!(?error, "Failed to parse scan options");
						error
					})
					.ok();
				parsed.map(Json)
			},
			None => None,
		}
	}
}
