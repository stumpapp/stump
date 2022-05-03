use rocket::Route;

pub mod auth;
pub mod library;
pub mod media;
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
        // job::get_jobs,
        // job::jobs_listener,
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
        series::get_series_thumbnail,
        // media api
        media::get_media,
        media::get_reading_media,
        media::get_media_by_id,
        media::get_media_file,
        media::get_media_page,
        media::get_media_thumbnail,
        media::update_media_progress,
    ]
}
