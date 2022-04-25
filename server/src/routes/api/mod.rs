use rocket::Route;

pub mod auth;
pub mod library;
pub mod series;

/// Function to return the routes for the `/api` path.
pub fn api() -> Vec<Route> {
    routes![
        // top level
        // routing::api::scan,
        // routing::api::event_listener,
        // auth
        auth::me,
        auth::login,
        auth::register,
        auth::logout,
        // logs api
        // routing::api::log::get_logs,
        // routing::api::log::log_listener,
        // library api
        library::get_libraries,
        library::get_library_by_id,
        library::scan_library,
        library::create_library,
        library::update_library,
        library::delete_library,
        // series api
        series::get_series,
        series::get_series_by_id,
        series::get_series_thumbnail
        // media api
        // routing::api::media::get_media,
        // routing::api::media::get_media_by_id,
        // routing::api::media::get_media_file,
        // routing::api::media::get_media_page,
        // routing::api::media::get_media_thumbnail,
        // routing::api::media::update_media_progress,
    ]
}
