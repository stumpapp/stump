use serde::{Deserialize, Serialize};

use crate::filesystem::{
	image::{PlaceholderGenerationJobConfig, ThumbnailGenerationJobParams},
	media::analysis::AnalysisJobConfig,
	metadata::MetadataFetchJobParams,
	scanner::ScanOptions,
};

use models::shared::image_processor_options::ImageProcessorOptions;

/// A unified job enum that can represent any job in the system.
/// This is the type stored in the apalis `MemoryStorage` and is what
/// gets enqueued via `Ctx::enqueue()`.
///
/// Each variant contains the data needed to construct and run the corresponding job.
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum StumpJob {
	LibraryScan {
		id: String,
		path: String,
		options: Option<ScanOptions>,
	},
	SeriesScan {
		id: String,
		path: String,
		options: Option<ScanOptions>,
	},
	ThumbnailGeneration {
		options: ImageProcessorOptions,
		params: ThumbnailGenerationJobParams,
	},
	PlaceholderGeneration {
		config: PlaceholderGenerationJobConfig,
	},
	MetadataFetch {
		params: MetadataFetchJobParams,
	},
	AnalyzeMedia {
		config: AnalysisJobConfig,
	},
}

impl StumpJob {
	/// Returns the human-readable name of the job
	pub fn name(&self) -> &'static str {
		match self {
			StumpJob::LibraryScan { .. } => "library_scan",
			StumpJob::SeriesScan { .. } => "series_scan",
			StumpJob::ThumbnailGeneration { .. } => "thumbnail_generation",
			StumpJob::PlaceholderGeneration { .. } => "placeholder_generation",
			StumpJob::MetadataFetch { .. } => "metadata_fetch",
			StumpJob::AnalyzeMedia { .. } => "analyze_media",
		}
	}

	/// Returns a description for the job
	pub fn description(&self) -> Option<String> {
		match self {
			StumpJob::LibraryScan { path, .. } => Some(path.clone()),
			StumpJob::SeriesScan { path, .. } => Some(path.clone()),
			StumpJob::ThumbnailGeneration { params, .. } => {
				Some(format!("Thumbnail generation: {:?}", params))
			},
			StumpJob::PlaceholderGeneration { .. } => Some(
				"Generate placeholder thumbnail metadata for media, series, or libraries"
					.to_string(),
			),
			StumpJob::MetadataFetch { params } => {
				Some(format!("Metadata fetch: {:?}", params.scope))
			},
			StumpJob::AnalyzeMedia { config } => {
				Some(format!("Analyze media: {:?}", config.scope))
			},
		}
	}

	pub fn library_scan(id: String, path: String, options: Option<ScanOptions>) -> Self {
		StumpJob::LibraryScan { id, path, options }
	}

	pub fn series_scan(id: String, path: String, options: Option<ScanOptions>) -> Self {
		StumpJob::SeriesScan { id, path, options }
	}

	pub fn thumbnail_generation(
		options: ImageProcessorOptions,
		params: ThumbnailGenerationJobParams,
	) -> Self {
		StumpJob::ThumbnailGeneration { options, params }
	}

	pub fn placeholder_generation(config: PlaceholderGenerationJobConfig) -> Self {
		StumpJob::PlaceholderGeneration { config }
	}

	pub fn metadata_fetch(params: MetadataFetchJobParams) -> Self {
		StumpJob::MetadataFetch { params }
	}

	pub fn analyze_media(config: AnalysisJobConfig) -> Self {
		StumpJob::AnalyzeMedia { config }
	}
}
