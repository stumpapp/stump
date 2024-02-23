use serde::{Deserialize, Serialize};
use specta::Type;
use utoipa::ToSchema;

use crate::prisma;

fn default_navigation_mode() -> String {
	"SIDEBAR".to_string()
}

fn default_layout_mode() -> String {
	"GRID".to_string()
}

fn default_true() -> bool {
	true
}

fn default_layout_max_width_px() -> Option<i32> {
	Some(1280)
}

#[derive(Debug, Clone, Serialize, Deserialize, Type, ToSchema)]
pub struct UserPreferences {
	pub id: String,
	pub locale: String,
	pub app_theme: String,
	pub show_query_indicator: bool,
	#[serde(default = "default_layout_mode")]
	pub preferred_layout_mode: String,
	#[serde(default = "default_navigation_mode")]
	pub primary_navigation_mode: String,
	#[serde(default = "default_layout_max_width_px")]
	pub layout_max_width_px: Option<i32>,
	#[serde(default)]
	pub enable_discord_presence: bool,
	#[serde(default)]
	pub enable_compact_display: bool,
	#[serde(default = "default_true")]
	pub enable_double_sidebar: bool,
	#[serde(default)]
	pub enable_hide_scrollbar: bool,
	#[serde(default)]
	pub enable_replace_primary_sidebar: bool,
	#[serde(default = "default_true")]
	pub prefer_accent_color: bool,
	#[serde(default)]
	pub show_thumbnails_in_headers: bool,
}

impl Default for UserPreferences {
	fn default() -> Self {
		Self {
			id: "DEFAULT".to_string(),
			locale: "en".to_string(),
			preferred_layout_mode: "GRID".to_string(),
			primary_navigation_mode: "SIDEBAR".to_string(),
			layout_max_width_px: Some(1280),
			app_theme: "LIGHT".to_string(),
			show_query_indicator: false,
			enable_discord_presence: false,
			enable_compact_display: false,
			enable_double_sidebar: true,
			enable_replace_primary_sidebar: false,
			enable_hide_scrollbar: false,
			prefer_accent_color: true,
			show_thumbnails_in_headers: false,
		}
	}
}

///////////////////////////////////////////////
////////////////// CONVERSIONS ////////////////
///////////////////////////////////////////////

impl From<prisma::user_preferences::Data> for UserPreferences {
	fn from(data: prisma::user_preferences::Data) -> UserPreferences {
		UserPreferences {
			id: data.id,
			locale: data.locale,
			preferred_layout_mode: data.preferred_layout_mode,
			primary_navigation_mode: data.primary_navigation_mode,
			layout_max_width_px: data.layout_max_width_px,
			app_theme: data.app_theme,
			show_query_indicator: data.show_query_indicator,
			enable_discord_presence: data.enable_discord_presence,
			enable_compact_display: data.enable_compact_display,
			enable_double_sidebar: data.enable_double_sidebar,
			enable_replace_primary_sidebar: data.enable_replace_primary_sidebar,
			enable_hide_scrollbar: data.enable_hide_scrollbar,
			prefer_accent_color: data.prefer_accent_color,
			show_thumbnails_in_headers: data.show_thumbnails_in_headers,
		}
	}
}
