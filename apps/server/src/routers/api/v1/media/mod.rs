pub(crate) mod bulk;
pub(crate) mod individual;
pub(crate) mod thumbnails;

use axum::{
	extract::{DefaultBodyLimit, Extension},
	middleware,
	routing::{get, post, put},
	Router,
};

use serde_qs::axum::QsQueryConfig;

use crate::{config::state::AppState, middleware::auth::auth_middleware};

pub(crate) fn mount(app_state: AppState) -> Router<AppState> {
	Router::new()
		.route(
			"/media",
			get(bulk::get_media).post(bulk::get_media_smart_search),
		)
		.route("/media/duplicates", get(bulk::get_duplicate_media))
		.route("/media/keep-reading", get(bulk::get_in_progress_media))
		.route("/media/recently-added", get(bulk::get_recently_added_media))
		.route("/media/path/:path", get(individual::get_media_by_path))
		.nest(
			"/media/:id",
			Router::new()
				.route("/", get(individual::get_media_by_id))
				.route("/file", get(individual::get_media_file))
				.route("/convert", get(individual::convert_media))
				.route(
					"/thumbnail",
					get(thumbnails::get_media_thumbnail_handler)
						.patch(thumbnails::patch_media_thumbnail)
						.post(thumbnails::replace_media_thumbnail)
						.layer(DefaultBodyLimit::max(
							app_state.config.max_image_upload_size,
						)),
				)
				.route("/analyze", post(individual::start_media_analysis))
				.route("/page/:page", get(individual::get_media_page))
				.route(
					"/progress",
					get(individual::get_media_progress)
						.delete(individual::delete_media_progress),
				)
				.route("/progress", put(individual::update_media_progress))
				.route(
					"/progress/complete",
					get(individual::get_is_media_completed)
						.put(individual::put_media_complete_status),
				)
				.route("/dimensions", get(individual::get_media_dimensions))
				.route(
					"/page/:page/dimensions",
					get(individual::get_media_page_dimensions),
				)
				.route(
					"/metadata",
					get(individual::get_media_metadata)
						.put(individual::put_media_metadata),
				),
		)
		.layer(Extension(QsQueryConfig::new(5, false)))
		.layer(middleware::from_fn_with_state(app_state, auth_middleware))
}
