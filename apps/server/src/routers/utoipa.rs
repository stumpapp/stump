// use axum::middleware::from_extractor_with_state;
use axum::middleware::from_extractor_with_state;
use axum::Router;
use stump_core::db::entity::*;
use stump_core::db::query::{ordering::*, pagination::*};
use stump_core::filesystem::{
	DirectoryListing, DirectoryListingFile, DirectoryListingInput,
};
use stump_core::job::{JobDetail, JobStatus};

use utoipa::OpenApi;
use utoipa_swagger_ui::SwaggerUi;

use crate::config::state::AppState;
use crate::errors::ApiError;
use crate::middleware::auth::Auth;
use crate::utils::{
	FilterableLibraryQuery, FilterableMediaQuery, FilterableSeriesQuery, LibraryFilter,
	MediaFilter, SeriesFilter, SeriesQueryRelation,
};

use super::api::{
	self,
	v1::{
		auth::LoginOrRegisterArgs, library::ScanQueryParam, ClaimResponse, StumpVersion,
	},
};

// NOTE: it is very easy to indirectly cause fmt failures by not adhering to the
// rustfmt rules, since cargo fmt will not format the code in the macro.
#[derive(OpenApi)]
#[openapi(
    paths(
        api::v1::claim,
        api::v1::ping,
        api::v1::version,
        api::v1::auth::viewer,
        api::v1::auth::login,
        api::v1::auth::logout,
        api::v1::auth::register,
        // TODO: epub here
        api::v1::filesystem::list_directory,
        api::v1::job::get_job_reports,
        api::v1::job::delete_job_reports,
        api::v1::job::cancel_job,
        api::v1::library::get_libraries,
        api::v1::library::get_libraries_stats,
        api::v1::library::get_library_by_id,
        api::v1::library::get_library_series,
        api::v1::library::get_library_thumbnail,
        api::v1::library::scan_library,
        api::v1::library::create_library,
        api::v1::library::update_library,
        api::v1::library::delete_library,
        api::v1::media::get_media,
        api::v1::media::get_duplicate_media,
        api::v1::media::get_in_progress_media,
        api::v1::media::get_recently_added_media,
        api::v1::media::get_media_by_id,
        api::v1::media::get_media_file,
        api::v1::media::convert_media,
        api::v1::media::get_media_page,
        api::v1::media::get_media_thumbnail_handler,
        api::v1::media::update_media_progress,
        api::v1::reading_list::get_reading_list,
        api::v1::reading_list::create_reading_list,
        api::v1::reading_list::get_reading_list_by_id,
        api::v1::reading_list::update_reading_list,
        api::v1::reading_list::delete_reading_list_by_id,
        api::v1::series::get_series,
        api::v1::series::get_series_by_id,
        api::v1::series::get_recently_added_series_handler,
        api::v1::series::get_series_thumbnail,
        api::v1::series::get_series_media,
        api::v1::tag::get_tags,
        api::v1::tag::create_tags,
        api::v1::series::get_next_in_series,
        api::v1::user::get_users,
        api::v1::user::create_user,
        api::v1::user::delete_user_by_id,
        api::v1::user::get_user_by_id,
        api::v1::user::update_user_handler,
        api::v1::user::get_user_preferences,
        api::v1::user::update_user_preferences,
    ),
    components(
        schemas(
            Library, LibraryOptions, Media, ReadingList, ReadProgress, Series, Tag, User,
            UserPreferences, LibraryPattern, LibraryScanMode, LogLevel, ClaimResponse,
            StumpVersion, FileStatus, PageableDirectoryListing, DirectoryListing,
            DirectoryListingFile, CursorInfo, PageInfo, PageableLibraries,
            PageableMedia, PageableSeries, LoginOrRegisterArgs, DirectoryListingInput,
            PageQuery, FilterableLibraryQuery, PaginationQuery, QueryOrder, LibraryFilter,
            Direction, CreateLibrary, UpdateLibrary, ApiError, MediaFilter, SeriesFilter,
            FilterableMediaQuery, FilterableSeriesQuery, JobDetail, LibrariesStats, ScanQueryParam,
            JobStatus, SeriesQueryRelation, CreateReadingList, UpdateUserPreferences, UpdateUser,
            CreateTags
        )
    ),
    tags(
        (name = "util", description = "Utility API"),
        (name = "auth", description = "Authentication API"),
        (name = "epub", description = "EPUB API"),
        (name = "filesystem", description = "Filesystem API"),
        (name = "job", description = "Job API"),
        (name = "library", description = "Library API"),
        (name = "media", description = "Media API"),
        (name = "series", description = "Series API"),
        (name = "tag", description = "Tag API"),
        (name = "reading-list", description = "Reading List API"),
        (name = "user", description = "User API"),
        (name = "opds", description = "OPDS API"),
    )
)]
struct ApiDoc;

pub(crate) fn mount(app_state: AppState) -> Router<AppState> {
	Router::new()
		.merge(swagger_ui())
		.layer(from_extractor_with_state::<Auth, AppState>(app_state))
}

pub(crate) fn swagger_ui() -> SwaggerUi {
	SwaggerUi::new("/swagger-ui").url("/api-doc/openapi.json", ApiDoc::openapi())
}
