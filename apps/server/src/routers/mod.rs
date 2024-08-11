use axum::Router;

use crate::config::state::AppState;

mod api;
mod opds;
mod spa;
mod sse;
mod utoipa;
mod ws;

pub(crate) use api::v1::auth::enforce_max_sessions;

pub(crate) fn mount(app_state: AppState) -> Router<AppState> {
	let mut app_router = Router::new();

	if !app_state.config.disable_swagger || app_state.config.is_debug() {
		app_router = app_router.merge(utoipa::mount(app_state.clone()));
	}

	app_router
		.merge(spa::mount(app_state.clone()))
		.merge(ws::mount(app_state.clone()))
		.merge(sse::mount())
		.merge(api::mount(app_state.clone()))
		.merge(opds::mount(app_state))
}

#[cfg(test)]
pub(crate) mod tests {
	use std::sync::Arc;

	use axum::{
		error_handling::HandleErrorLayer,
		http::{HeaderName, HeaderValue},
		Router, ServiceExt,
	};
	use axum_test::{TestServer, TestServerConfig};
	use prisma_client_rust::{
		chrono::{DateTime, Duration, FixedOffset, Utc},
		Direction, MockStore,
	};
	use stump_core::{
		db::entity::{PermissionSet, User},
		prisma::{session, user, user_login_activity, user_preferences, PrismaClient},
		Ctx,
	};
	use tower::ServiceBuilder;
	use tower_sessions::{cookie::SameSite, MemoryStore, SessionManagerLayer};

	use crate::{
		config::{
			cors::get_cors_layer,
			session::{get_session_layer, handle_session_service_error},
			state::AppState,
		},
		errors::APIResult,
		http_server::StumpRequestInfo,
	};

	// TODO: accept params to customize the test server (e.g. expect_success, etc.)
	pub fn setup_test_app() -> (Arc<PrismaClient>, MockStore, TestServer) {
		let (ctx, mock) = Ctx::mock();

		let client = ctx.db.clone();

		let cors_layer = get_cors_layer(ctx.config.as_ref().clone());
		let session_layer = {
			// Note: we use the memory store because the session store (backed by prisma)
			// is just too complex to mock out for testing.
			let store = MemoryStore::default();
			SessionManagerLayer::new(store)
				.with_name("stump-test-session")
				.with_max_age(time::Duration::seconds(ctx.config.session_ttl))
				.with_path("/".to_string())
				.with_same_site(SameSite::Lax)
				.with_secure(false)
		};
		let app_state = AppState::new(ctx);
		let session_service = ServiceBuilder::new()
			.layer(HandleErrorLayer::new(handle_session_service_error))
			.layer(session_layer);

		let router = super::mount(app_state.clone());
		let app = Router::new()
			.merge(router)
			.with_state(app_state)
			.layer(session_service)
			.layer(cors_layer)
			.into_make_service_with_connect_info::<StumpRequestInfo>();

		let config = TestServerConfig::builder()
			.save_cookies()
			.http_transport()
			.build();

		let mut server = TestServer::new_with_config(app, config).unwrap();
		server.add_header(
			HeaderName::from_static("user-agent"),
			HeaderValue::from_static("Stump Test Harness"),
		);

		(client, mock, server)
	}

	pub async fn login_user(
		user: &User,
		server: &TestServer,
		client: &Arc<PrismaClient>,
		mock: &MockStore,
	) -> APIResult<()> {
		let where_condition = vec![
			user::username::equals(user.username.clone()),
			user::deleted_at::equals(None),
		];
		let today: DateTime<FixedOffset> = Utc::now().into();
		let twenty_four_hours_ago = today - Duration::hours(24);

		let user_preferences = user.user_preferences.clone().unwrap_or_default();
		let user_permissions =
			PermissionSet::new(user.permissions.clone()).resolve_into_string();

		// Note: this is so ugly lol
		mock.expect(
			client
				.user()
				.find_first(where_condition)
				.with(user::user_preferences::fetch())
				.with(user::age_restriction::fetch())
				.with(
					user::login_activity::fetch(vec![
						user_login_activity::timestamp::gte(twenty_four_hours_ago),
						user_login_activity::timestamp::lte(today),
					])
					.order_by(user_login_activity::timestamp::order(Direction::Desc))
					.take(10),
				)
				.with(user::sessions::fetch(vec![session::expires_at::gt(
					Utc::now().into(),
				)])),
			Some(user::Data {
				id: user.id.clone(),
				username: user.username.clone(),
				hashed_password: String::default(),
				is_server_owner: user.is_server_owner,
				avatar_url: user.avatar_url.clone(),
				created_at: user.created_at.parse().expect("Failed to parse date"),
				deleted_at: None,
				is_locked: user.is_locked,
				max_sessions_allowed: user.max_sessions_allowed,
				permissions: user_permissions,
				reviews: None,
				user_preferences: Some(Some(Box::new(user_preferences::Data {
					id: user_preferences.id,
					locale: user_preferences.locale,
					preferred_layout_mode: user_preferences.preferred_layout_mode,
					primary_navigation_mode: user_preferences.primary_navigation_mode,
					layout_max_width_px: user_preferences.layout_max_width_px,
					app_theme: user_preferences.app_theme,
					app_font: user_preferences.app_font.to_string(),
					show_query_indicator: user_preferences.show_query_indicator,
					enable_live_refetch: user_preferences.enable_live_refetch,
					enable_discord_presence: user_preferences.enable_discord_presence,
					enable_compact_display: user_preferences.enable_compact_display,
					enable_double_sidebar: user_preferences.enable_double_sidebar,
					enable_replace_primary_sidebar: user_preferences
						.enable_replace_primary_sidebar,
					enable_hide_scrollbar: user_preferences.enable_hide_scrollbar,
					prefer_accent_color: user_preferences.prefer_accent_color,
					show_thumbnails_in_headers: user_preferences
						.show_thumbnails_in_headers,
					navigation_arrangement: None,
					home_arrangement: None,
					user: None,
					user_id: None,
				}))),
				login_activity: None,
				sessions: None,
				library_visits: None,
				smart_lists: None,
				smart_list_access_rules: None,
				email_usage_history: None,
				last_login: None,
				active_reading_sessions: None,
				finished_reading_sessions: None,
				reading_lists: None,
				book_club_memberships: None,
				book_club_invitations: None,
				age_restriction: None,
				libraries_hidden_from_user: None,
				user_preferences_id: None,
				bookmarks: None,
				media_annotations: None,
			}),
		)
		.await;

		let response = server
			.post("/api/v1/auth/login")
			.json(&serde_json::json!({
				"username": user.username,
				"password": "password",
			}))
			.await;
		dbg!(&response);
		assert_eq!(response.status_code().as_u16(), 200);

		Ok(())
	}
}
