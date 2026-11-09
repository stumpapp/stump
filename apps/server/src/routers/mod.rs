use axum::Router;

use crate::config::state::AppState;

mod api;
mod kobo;
mod koreader;
mod opds;
mod spa;

pub(crate) use api::v2::auth::enforce_max_sessions;
pub(crate) use spa::relative_favicon_path;

pub async fn mount(app_state: AppState) -> Router<AppState> {
	let mut app_router = Router::new();

	if app_state.config.enable_koreader_sync {
		app_router = app_router.merge(koreader::mount(app_state.clone()));
	}

	if app_state.config.enable_kobo_sync {
		app_router = app_router.merge(kobo::mount(app_state.clone()));
	}

	let base_path = app_state.config.base_path.clone();
	let router = app_router
		.merge(spa::mount(app_state.clone()))
		.merge(api::mount(app_state.clone()).await)
		.merge(opds::mount(app_state));

	mount_at_base_path(router, &base_path)
}

/// Keep the prefix outside all application routers, including their SPA fallback.
fn mount_at_base_path<S: Clone + Send + Sync + 'static>(
	router: Router<S>,
	base_path: &str,
) -> Router<S> {
	if base_path.is_empty() {
		router
	} else {
		let location = format!("{base_path}/");
		Router::new()
			.route(
				"/",
				axum::routing::get({
					let location = location.clone();
					move |uri: axum::http::Uri| async move {
						let location = match uri.query() {
							Some(query) => format!("{location}?{query}"),
							None => location,
						};
						axum::response::Redirect::permanent(&location)
					}
				}),
			)
			.route(
				base_path,
				axum::routing::get(move |uri: axum::http::Uri| async move {
					let location = match uri.query() {
						Some(query) => format!("{location}?{query}"),
						None => location,
					};
					axum::response::Redirect::permanent(&location)
				}),
			)
			.nest(&format!("{base_path}/"), router)
	}
}

#[cfg(test)]
mod tests {
	use std::sync::Arc;

	use axum::{extract::State, routing::get};
	use axum_test::TestServer;
	use sea_orm::{DatabaseBackend, MockDatabase};
	use stump_core::Ctx;

	use super::*;
	use crate::middleware::HostExtractor;

	#[tokio::test]
	async fn merged_router_serves_spa_at_configured_prefix() {
		let dist = tempfile::tempdir().unwrap();
		std::fs::write(dist.path().join("index.html"), "<html><head></head></html>")
			.unwrap();
		let mut ctx = Ctx::mock_sea(MockDatabase::new(DatabaseBackend::Sqlite));
		let config = Arc::make_mut(&mut ctx.config);
		config.client_dir = dist.path().to_string_lossy().into_owned();
		config.base_path = "/ss".to_string();
		let ctx = Arc::new(ctx);
		let server = TestServer::new(mount(ctx.clone()).await.with_state(ctx)).unwrap();

		server
			.get("/ss/")
			.await
			.assert_text("<html><head><base href=\"/ss/\"></head></html>");
		server
			.get("/ss/auth")
			.await
			.assert_text("<html><head><base href=\"/ss/\"></head></html>");
		server.get("/ss").await.assert_header("location", "/ss/");
		server.get("/").await.assert_header("location", "/ss/");
	}

	#[tokio::test]
	async fn subpath_authentication_routes_keep_the_prefix() {
		let mut ctx = Ctx::mock_sea(MockDatabase::new(DatabaseBackend::Sqlite));
		let config = Arc::make_mut(&mut ctx.config);
		config.base_path = "/mysubpath/mysvc".to_string();
		config.trust_proxy_headers = true;
		config.expired_session_cleanup_interval = 0;
		let ctx = Arc::new(ctx);
		let server = TestServer::new(
			mount(ctx.clone())
				.await
				.with_state(ctx.clone())
				.layer(crate::config::session::get_session_layer(ctx)),
		)
		.unwrap();
		server
			.get("/mysubpath/mysvc/api/v2/ping")
			.await
			.assert_status_ok();
		let response = server
			.get("/mysubpath/mysvc/opds/v2.0/catalog")
			.add_header("host", "example.org")
			.add_header("x-forwarded-proto", "https")
			.await;
		response.assert_status_unauthorized();
		assert!(
			response
				.header("link")
				.to_str()
				.unwrap()
				.contains("https://example.org/mysubpath/mysvc/opds/v2.0/auth")
		);
		let response = server
			.get("/mysubpath/mysvc/opds/v2.0/auth")
			.add_header("host", "example.org")
			.add_header("x-forwarded-proto", "https")
			.await;
		response.assert_status_ok();
		assert!(
			response.text().contains(
				"\"id\":\"https://example.org/mysubpath/mysvc/opds/v2.0/auth\""
			)
		);
		assert!(
			response
				.text()
				.contains("https://example.org/mysubpath/mysvc/assets/favicon.ico")
		);
		let response = server.get("/mysubpath/mysvc/api/graphql").await;
		response.assert_status(axum::http::StatusCode::SEE_OTHER);
		response.assert_header(
			"location",
			"/mysubpath/mysvc/auth?redirect=%2Fapi%2Fgraphql",
		);
	}

	#[tokio::test]
	async fn subpath_serves_spa_deep_links_assets_and_api() {
		let dist = tempfile::tempdir().unwrap();
		std::fs::create_dir(dist.path().join("assets")).unwrap();
		std::fs::write(
			dist.path().join("index.html"),
			"<html><head></head><body><script src=\"./assets/app.js\"></script></body></html>",
		)
		.unwrap();
		std::fs::write(dist.path().join("assets/app.js"), "console.log('stump')")
			.unwrap();
		std::fs::write(dist.path().join("sw.js"), "// worker").unwrap();

		for base_path in ["", "/stump", "/apps/stump"] {
			let mut ctx = Ctx::mock_sea(MockDatabase::new(DatabaseBackend::Sqlite));
			let config = Arc::make_mut(&mut ctx.config);
			config.client_dir = dist.path().to_string_lossy().into_owned();
			config.base_path = base_path.to_string();
			let ctx = Arc::new(ctx);
			let router = spa::mount(ctx.clone()).route(
				"/api/test",
				get(
					|HostExtractor(host): HostExtractor, State(_): State<AppState>| async move {
						host.url_for_path("api/test")
					},
				),
			);
			let server =
				TestServer::new(mount_at_base_path(router, base_path).with_state(ctx))
					.unwrap();

			for path in ["/", "/index.html", "/libraries/123", "/auth"] {
				let response = server.get(&format!("{base_path}{path}")).await;
				response.assert_status_ok();
				assert!(
					response
						.text()
						.contains(&format!("<base href=\"{base_path}/\">"))
				);
				assert!(
					response
						.header("cache-control")
						.to_str()
						.unwrap()
						.contains("no-store")
				);
			}
			server
				.get(&format!("{base_path}/assets/app.js"))
				.await
				.assert_text("console.log('stump')");
			server
				.get(&format!("{base_path}/sw.js"))
				.await
				.assert_text("// worker");
			let response = server
				.get(&format!("{base_path}/api/test"))
				.add_header("host", "example.org")
				.await;
			response.assert_text(format!("http://example.org{base_path}/api/test"));
			if !base_path.is_empty() {
				let redirect = server.get("/?page=1").await;
				redirect.assert_status(axum::http::StatusCode::PERMANENT_REDIRECT);
				redirect.assert_header("location", format!("{base_path}/?page=1"));
				server.get("/assets/app.js").await.assert_status_not_found();
				let redirect = server.get(&format!("{base_path}?page=1")).await;
				redirect.assert_status(axum::http::StatusCode::PERMANENT_REDIRECT);
				redirect.assert_header("location", format!("{base_path}/?page=1"));
			}
		}
	}
}
