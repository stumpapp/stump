use rocket::Route;

pub mod auth;

/// Function to return the routes for the `/api` path.
pub fn api() -> Vec<Route> {
    routes![
        // // top level
        // routing::api::scan,
        // routing::api::event_listener,
        // // auth
        auth::me,
        // routing::api::auth::login,
        // routing::api::auth::register,
        // // logs api
        // routing::api::log::get_logs,
        // routing::api::log::log_listener,
        // // library api
        // routing::api::library::get_libraries,
        // routing::api::library::get_library,
        // routing::api::library::get_library_series,
        // routing::api::library::insert_library,
        // routing::api::library::update_library,
        // routing::api::library::delete_library,
        // routing::api::library::scan_library,
        // // series api
        // routing::api::series::get_series,
        // routing::api::series::get_series_by_id,
        // routing::api::series::get_series_thumbnail,
        // // media api
        // routing::api::media::get_media,
        // routing::api::media::get_media_by_id,
        // routing::api::media::get_media_file,
        // routing::api::media::get_media_page,
        // routing::api::media::get_media_thumbnail,
        // routing::api::media::update_media_progress,
    ]
}
