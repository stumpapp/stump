use axum::middleware::from_extractor_with_state;
use axum::Router;
use stump_core::db::entity::*;
// TODO: investigate how to get this working for swagger...
use stump_core::db::filter::{SmartFilterSchema as SmartFilter, *};
use stump_core::db::query::{ordering::*, pagination::*};
use stump_core::filesystem::{
	DirectoryListing, DirectoryListingFile, DirectoryListingInput,
};
use stump_core::job::JobStatus;

use utoipa::OpenApi;
use utoipa_swagger_ui::SwaggerUi;

use crate::config::state::AppState;
use crate::errors::APIError;
use crate::filter::{
	FilterableLibraryQuery, FilterableMediaQuery, FilterableSeriesQuery, LibraryFilter,
	MediaFilter, SeriesFilter, SeriesQueryRelation,
};
use crate::middleware::auth::Auth;

use super::api::{
	self,
	v1::{
		auth::LoginOrRegisterArgs, library::*, media::*, notifier::*, series::*,
		smart_list::*, user::*, ClaimResponse, StumpVersion,
	},
};

// TODO: investigate https://github.com/ProbablyClem/utoipauto

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
        api::v1::job::get_jobs,
        api::v1::job::delete_jobs,
        api::v1::job::delete_job_by_id,
        api::v1::job::cancel_job_by_id,
        api::v1::job::get_scheduler_config,
        api::v1::job::update_scheduler_config,
        api::v1::library::get_libraries,
        api::v1::library::get_libraries_stats,
        api::v1::library::get_library_by_id,
        api::v1::library::get_library_series,
        api::v1::library::get_library_thumbnail_handler,
        api::v1::library::delete_library_thumbnails,
        api::v1::library::generate_library_thumbnails,
        api::v1::library::scan_library,
        api::v1::library::clean_library,
        api::v1::library::create_library,
        api::v1::library::update_library,
        api::v1::library::delete_library,
        api::v1::log::get_logs,
        api::v1::log::delete_logs,
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
        api::v1::media::get_media_progress,
        api::v1::media::delete_media_progress,
        api::v1::media::get_is_media_completed,
        api::v1::media::put_media_complete_status,
        api::v1::metadata::get_metadata_overview,
        api::v1::metadata::get_genres_handler,
        api::v1::metadata::get_writers_handler,
        api::v1::metadata::get_pencillers_handler,
        api::v1::metadata::get_inkers_handler,
        api::v1::metadata::get_colorists_handler,
        api::v1::metadata::get_letterers_handler,
        api::v1::metadata::get_editors_handler,
        api::v1::metadata::get_publishers_handler,
        api::v1::metadata::get_characters_handler,
        api::v1::metadata::get_teams_handler,
        api::v1::notifier::get_notifiers,
        api::v1::notifier::get_notifier_by_id,
        api::v1::notifier::create_notifier,
        api::v1::notifier::update_notifier,
        api::v1::notifier::patch_notifier,
        api::v1::notifier::delete_notifier,
        api::v1::reading_list::get_reading_list,
        api::v1::reading_list::create_reading_list,
        api::v1::reading_list::get_reading_list_by_id,
        api::v1::reading_list::update_reading_list,
        api::v1::reading_list::delete_reading_list_by_id,
        api::v1::series::get_series,
        api::v1::series::get_series_by_id,
        api::v1::series::get_recently_added_series_handler,
        api::v1::series::get_series_thumbnail_handler,
        api::v1::series::get_series_media,
        api::v1::series::get_series_is_complete,
        api::v1::smart_list::get_smart_lists,
        api::v1::smart_list::create_smart_list,
        api::v1::smart_list::get_smart_list_by_id,
        api::v1::smart_list::update_smart_list_by_id,
        api::v1::smart_list::delete_smart_list_by_id,
        api::v1::smart_list::get_smart_list_items,
        api::v1::smart_list::get_smart_list_meta,
        api::v1::smart_list::get_smart_list_views,
        api::v1::smart_list::get_smart_list_view,
        api::v1::smart_list::create_smart_list_view,
        api::v1::smart_list::update_smart_list_view,
        api::v1::smart_list::delete_smart_list_view,
        api::v1::tag::get_tags,
        api::v1::tag::create_tags,
        api::v1::series::get_next_in_series,
        api::v1::user::get_users,
        api::v1::user::get_user_login_activity,
        api::v1::user::delete_user_login_activity,
        api::v1::user::create_user,
        api::v1::user::delete_user_by_id,
        api::v1::user::get_user_by_id,
        api::v1::user::get_user_login_activity_by_id,
        api::v1::user::update_user_handler,
        api::v1::user::get_user_preferences,
        api::v1::user::update_user_preferences,
        api::v1::user::update_user_lock_status
    ),
    components(
        schemas(
            Library, LibraryOptions, Media, ReadingList, ReadProgress, Series, Tag, User,
            UserPreferences, LibraryPattern, LibraryScanMode, LogLevel, ClaimResponse,
            StumpVersion, FileStatus, PageableDirectoryListing, DirectoryListing,
            DirectoryListingFile, CursorInfo, PageInfo, PageableLibraries,
            PageableMedia, PageableSeries, LoginOrRegisterArgs, DirectoryListingInput,
            PageQuery, FilterableLibraryQuery, PaginationQuery, QueryOrder, LibraryFilter,
            Direction, CreateLibrary, UpdateLibrary, APIError, MediaFilter, SeriesFilter,
            FilterableMediaQuery, FilterableSeriesQuery, LibraryStats,
            JobStatus, SeriesQueryRelation, CreateReadingList, UpdateUserPreferences, UpdateUser,
            CreateTags, CleanLibraryResponse, MediaIsComplete, SeriesIsComplete, PutMediaCompletionStatus,
            SmartList, SmartListMeta, SmartListItems, SmartListView, CreateOrUpdateSmartList,
            CreateOrUpdateSmartListView, SmartListItemGrouping, SmartFilter, FilterJoin, EntityVisibility,
            SmartListViewConfig, ReactTableColumnSort, ReactTableGlobalSort,
            MediaSmartFilter, MediaMetadataSmartFilter, SeriesSmartFilter, SeriesMetadataSmartFilter,
            LibrarySmartFilter, Notifier, CreateOrUpdateNotifier, PatchNotifier
        )
    ),
    tags(
        (name = "util", description = "Utility API"),
        (name = "book_club", description = "Book Club API"),
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
