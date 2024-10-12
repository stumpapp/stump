use stump_core::{
	db::entity::{PermissionSet, User},
	prisma::{user, user_preferences},
};

pub fn create_prisma_user(user: &User, hashed_pass: String) -> user::Data {
	let user_preferences = user.user_preferences.clone().unwrap_or_default();
	let user_permissions =
		PermissionSet::new(user.permissions.clone()).resolve_into_string();

	user::Data {
		id: user.id.clone(),
		username: user.username.clone(),
		hashed_password: hashed_pass,
		is_server_owner: user.is_server_owner,
		avatar_url: user.avatar_url.clone(),
		created_at: user.created_at,
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
			enable_gradients: user_preferences.enable_gradients,
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
			show_thumbnails_in_headers: user_preferences.show_thumbnails_in_headers,
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
	}
}
