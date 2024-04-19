use serde::{Deserialize, Serialize};
use specta::Type;
use utoipa::ToSchema;

use crate::prisma;

#[derive(Default, Debug, Clone, Serialize, Deserialize, Type, ToSchema)]
pub enum NavigationMode {
	#[default]
	#[serde(rename = "SIDEBAR")]
	SideBar,
	#[serde(rename = "TOPBAR")]
	TopBar,
}

// TODO: support order_by for some options with actions

#[derive(Debug, Clone, Serialize, Deserialize, Type, ToSchema)]
pub struct NaviationItemDisplayOptions {
	#[serde(default = "default_true")]
	pub show_create_action: bool,
	#[serde(default)]
	pub show_link_to_all: bool,
}

impl Default for NaviationItemDisplayOptions {
	fn default() -> Self {
		Self {
			show_create_action: true,
			show_link_to_all: false,
		}
	}
}

#[derive(Debug, Clone, Serialize, Deserialize, Type, ToSchema)]
#[serde(tag = "type")]
pub enum NavigationItem {
	Home,
	Explore,
	Libraries(NaviationItemDisplayOptions),
	SmartLists(NaviationItemDisplayOptions),
	BookClubs(NaviationItemDisplayOptions),
}

// TODO: support order_by in some options (e.g. Library)

#[derive(Debug, Clone, Serialize, Deserialize, Type, ToSchema)]
#[serde(tag = "type")]
pub enum HomeItem {
	ContinueReading,
	RecentlyAddedBooks,
	RecentlyAddedSeries,
	Library { library_id: String },
	SmartList { smart_list_id: String },
}

#[derive(Debug, Clone, Serialize, Deserialize, Type, ToSchema)]
pub struct ArrangementItem<I> {
	item: I,
	#[serde(default = "default_true")]
	visible: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type, ToSchema)]
pub struct Arrangement<I> {
	locked: bool,
	items: Vec<ArrangementItem<I>>,
}

impl<I> Arrangement<I> {
	pub fn default_navigation() -> Arrangement<NavigationItem> {
		Arrangement {
			locked: true,
			items: vec![
				ArrangementItem {
					item: NavigationItem::Home,
					visible: true,
				},
				ArrangementItem {
					item: NavigationItem::Explore,
					visible: true,
				},
				ArrangementItem {
					item: NavigationItem::Libraries(
						NaviationItemDisplayOptions::default(),
					),
					visible: true,
				},
				ArrangementItem {
					item: NavigationItem::SmartLists(
						NaviationItemDisplayOptions::default(),
					),
					visible: true,
				},
				ArrangementItem {
					item: NavigationItem::BookClubs(
						NaviationItemDisplayOptions::default(),
					),
					visible: true,
				},
			],
		}
	}

	pub fn default_home() -> Arrangement<HomeItem> {
		Arrangement {
			locked: true,
			items: vec![
				ArrangementItem {
					item: HomeItem::ContinueReading,
					visible: true,
				},
				ArrangementItem {
					item: HomeItem::RecentlyAddedBooks,
					visible: true,
				},
				ArrangementItem {
					item: HomeItem::RecentlyAddedSeries,
					visible: true,
				},
			],
		}
	}
}

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
	#[serde(default)]
	pub enable_live_refetch: bool,
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

	#[serde(default = "Arrangement::<NavigationItem>::default_navigation")]
	pub navigation_arrangement: Arrangement<NavigationItem>,
	#[serde(default = "Arrangement::<HomeItem>::default_home")]
	pub home_arrangement: Arrangement<HomeItem>,
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
			enable_live_refetch: false,
			enable_discord_presence: false,
			enable_compact_display: false,
			enable_double_sidebar: true,
			enable_replace_primary_sidebar: false,
			enable_hide_scrollbar: false,
			prefer_accent_color: true,
			show_thumbnails_in_headers: false,
			navigation_arrangement: Arrangement::<NavigationItem>::default_navigation(),
			home_arrangement: Arrangement::<HomeItem>::default_home(),
		}
	}
}

///////////////////////////////////////////////
////////////////// CONVERSIONS ////////////////
///////////////////////////////////////////////

impl From<prisma::user_preferences::Data> for UserPreferences {
	fn from(data: prisma::user_preferences::Data) -> UserPreferences {
		let navigation_arrangement = data
			.navigation_arrangement
			.map(|bytes| {
				serde_json::from_slice(&bytes).map_or_else(
					|error| {
						tracing::error!(
							?error,
							"Failed to deserialize navigation arrangement"
						);
						Arrangement::<NavigationItem>::default_navigation()
					},
					|v| v,
				)
			})
			.unwrap_or_else(Arrangement::<NavigationItem>::default_navigation);

		let home_arrangement = data
			.home_arrangement
			.map(|bytes| {
				serde_json::from_slice(&bytes).map_or_else(
					|error| {
						tracing::error!(?error, "Failed to deserialize home arrangement");
						Arrangement::<HomeItem>::default_home()
					},
					|v| v,
				)
			})
			.unwrap_or_else(Arrangement::<HomeItem>::default_home);

		UserPreferences {
			id: data.id,
			locale: data.locale,
			preferred_layout_mode: data.preferred_layout_mode,
			primary_navigation_mode: data.primary_navigation_mode,
			layout_max_width_px: data.layout_max_width_px,
			app_theme: data.app_theme,
			show_query_indicator: data.show_query_indicator,
			enable_live_refetch: data.enable_live_refetch,
			enable_discord_presence: data.enable_discord_presence,
			enable_compact_display: data.enable_compact_display,
			enable_double_sidebar: data.enable_double_sidebar,
			enable_replace_primary_sidebar: data.enable_replace_primary_sidebar,
			enable_hide_scrollbar: data.enable_hide_scrollbar,
			prefer_accent_color: data.prefer_accent_color,
			show_thumbnails_in_headers: data.show_thumbnails_in_headers,
			navigation_arrangement,
			home_arrangement,
		}
	}
}
