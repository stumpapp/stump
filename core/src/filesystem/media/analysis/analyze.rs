use crate::{
	filesystem::media::{
		analysis::job::{AnalyzeMediaJob, AnalyzeMediaOutput},
		get_page,
	},
	job::{error::JobError, JobExecuteLog, JobProgress, JobTaskOutput, WorkerCtx},
};

use std::sync::{
	atomic::{AtomicUsize, Ordering},
	Arc,
};

use futures::{stream, StreamExt};
use image::GenericImageView;
use models::{
	entity::media_analysis,
	shared::analysis::{MediaAnalysisData, PageDimension},
};
use sea_orm::{sea_query::OnConflict, ActiveValue::Set, EntityTrait, FromQueryResult};

#[derive(Debug, Clone, FromQueryResult)]
pub struct MediaForProcessing {
	pub id: String,
	pub path: String,
	pub pages: i32,
	pub page_count: Option<i32>,
}

struct BookPageAnalysisOutput {
	dimensions: PageDimension,
	content_type: String,
}

struct ExistingPageAnalysis {
	dimensions: Option<PageDimension>,
	content_type: Option<String>,
}

impl ExistingPageAnalysis {
	fn new(existing_analysis: &Option<MediaAnalysisData>, page: usize) -> Self {
		let mut this = ExistingPageAnalysis {
			dimensions: None,
			content_type: None,
		};

		if let Some(analysis) = existing_analysis {
			if let Some(dimensions) = analysis.dimensions.get(page) {
				this.dimensions = Some(dimensions.clone());
			}
			if let Some(content_type) = analysis.content_types.get(page) {
				this.content_type = Some(content_type.clone());
			}
		}
		this
	}

	fn has_all(&self) -> bool {
		self.dimensions.is_some() && self.content_type.is_some()
	}
}

async fn analyze_book_page(
	path: String,
	page: i32,
	existing_analysis: ExistingPageAnalysis,
	ctx: &WorkerCtx,
	force_reanalysis: bool,
) -> Result<BookPageAnalysisOutput, JobError> {
	// If we aren't force reanalyzing and we have all of the things we need, return early
	if !force_reanalysis && existing_analysis.has_all() {
		return Ok(BookPageAnalysisOutput {
			dimensions: existing_analysis.dimensions.unwrap(),
			content_type: existing_analysis.content_type.unwrap(),
		});
	}

	let (content_type, page_data) = get_page(&path, page, &ctx.config)?;
	let image_format = content_type.try_into()?;

	let (width, height) = image::load_from_memory_with_format(&page_data, image_format)
		.map_err(|e| JobError::TaskFailed(format!("Error loading image data: {e}")))?
		.dimensions();
	let dimensions = PageDimension { height, width };

	// TODO: Re-add page counting

	Ok(BookPageAnalysisOutput {
		dimensions,
		content_type: content_type.mime_type(),
	})
}

pub async fn safely_analyze_book(
	book: MediaForProcessing,
	existing_analysis: Option<MediaAnalysisData>,
	ctx: &WorkerCtx,
	force_reanalysis: bool,
) -> JobTaskOutput<AnalyzeMediaJob> {
	let mut output = AnalyzeMediaOutput::default();
	let mut logs = Vec::new();

	let page_count = book.page_count.unwrap_or(book.pages);

	let mut image_dimensions: Vec<PageDimension> =
		Vec::with_capacity(page_count as usize);
	let mut content_types: Vec<String> = Vec::with_capacity(page_count as usize);

	// TODO: Make this configurable
	let concurrency = 10;
	let completed = Arc::new(AtomicUsize::new(0));

	ctx.report_progress(JobProgress::subtask_position(0, page_count));

	let mut page_stream = stream::iter(1..=page_count)
		.map(|page_num| {
			let book_path = book.path.clone();
			let existing = existing_analysis.clone();
			let ctx_clone = ctx.clone();
			let completed = completed.clone();

			async move {
				let analysis = analyze_book_page(
					book_path,
					page_num,
					ExistingPageAnalysis::new(&existing, (page_num - 1) as usize),
					&ctx_clone,
					force_reanalysis,
				)
				.await;
				let count = completed.fetch_add(1, Ordering::Relaxed) + 1;
				ctx_clone.report_progress(JobProgress::subtask_position(
					count as i32,
					page_count,
				));

				(page_num, analysis)
			}
		})
		.buffered(concurrency);

	while let Some((page_num, analysis)) = page_stream.next().await {
		match analysis {
			Ok(result) => {
				image_dimensions.push(result.dimensions);
				content_types.push(result.content_type);
				output.pages_analyzed += 1;
			},
			Err(err) => {
				// TODO: This is REALLY tricky. We rely on the vecs to fully encapsulate the pages, i.e. an elem
				// per page. If we skip a page due to an error, we will have misaligned data. It might be better to
				// either:
				// 1. Use an enum and push a "failed" variant to the vecs that resolves to None later
				// 2. Restructure to use a map of page number to analysis data
				// This requires rethinking the entire analysis storage structure, so for now we will just log the error
				tracing::error!(
					?err,
					book_id = %book.id,
					"Failed to analyze page {}/{}",
					page_num,
					page_count
				);
				logs.push(
					JobExecuteLog::error(format!(
						"Failed to analyze page {}/{}",
						page_num, page_count
					))
					.with_ctx(book.id.clone()),
				);
			},
		}
	}

	let constructed_analysis = MediaAnalysisData {
		dimensions: image_dimensions,
		content_types,
	};

	match &existing_analysis {
		Some(existing) if existing == &constructed_analysis => {
			// No changes, do nothing
			tracing::trace!(
                book_id = %book.id,
                "No changes detected in analysis, skipping database write");
			return JobTaskOutput {
				output,
				logs,
				subtasks: vec![],
			};
		},

		_ => {},
	}

	let model = media_analysis::ActiveModel {
		media_id: Set(book.id.clone()),
		data: Set(constructed_analysis),
		..Default::default()
	};

	if let Err(e) = media_analysis::Entity::insert(model)
		.on_conflict(
			OnConflict::columns([media_analysis::Column::MediaId])
				.update_columns([media_analysis::Column::Data])
				.to_owned(),
		)
		.exec(ctx.conn.as_ref())
		.await
	{
		tracing::error!(
			?e,
			book_id = %book.id,
			"Failed to write analysis data to database"
		);
		logs.push(
			JobExecuteLog::error(format!(
				"Failed to write analysis data to database: {}",
				e
			))
			.with_ctx(book.id.clone()),
		);
	} else {
		tracing::trace!(book_id = %book.id, "Successfully wrote page analysis to database");
	}

	JobTaskOutput {
		output,
		logs,
		subtasks: vec![],
	}
}
