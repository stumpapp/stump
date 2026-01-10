use async_graphql::InputObject;
use models::shared::{
	arrangement::ArrangementSection,
	enums::{InterfaceLayout, SupportedFont, UserPermission},
};

#[derive(InputObject)]
pub struct AgeRestrictionInput {
	pub age: i32,
	pub restrict_on_unset: bool,
}

#[derive(InputObject)]
pub struct CreateUserInput {
	pub username: String,
	pub password: String,
	pub permissions: Vec<UserPermission>,
	#[graphql(default)]
	pub age_restriction: Option<AgeRestrictionInput>,
	pub max_sessions_allowed: Option<i32>,
}

#[derive(InputObject)]
pub struct UpdateUserInput {
	pub username: String,
	pub password: Option<String>,
	pub avatar_url: Option<String>,
	pub permissions: Vec<UserPermission>,
	#[graphql(default)]
	pub age_restriction: Option<AgeRestrictionInput>,
	pub max_sessions_allowed: Option<i32>,
}

#[derive(InputObject, Debug)]
pub struct UpdateUserPreferencesInput {
	pub locale: String,
	pub preferred_layout_mode: InterfaceLayout,
	pub primary_navigation_mode: String,
	pub layout_max_width_px: Option<i32>,
	pub app_theme: String,
	pub enable_gradients: bool,
	pub app_font: SupportedFont,
	pub show_query_indicator: bool,
	pub enable_live_refetch: bool,
	pub enable_discord_presence: bool,
	pub enable_compact_display: bool,
	pub enable_double_sidebar: bool,
	pub enable_replace_primary_sidebar: bool,
	pub enable_hide_scrollbar: bool,
	pub enable_job_overlay: bool,
	pub prefer_accent_color: bool,
	pub show_thumbnails_in_headers: bool,
	pub thumbnail_ratio: f32,
	pub enable_alphabet_select: bool,
}

#[derive(InputObject, Debug)]
pub struct NavigationArrangementInput {
	pub sections: Vec<ArrangementSection>,
}
