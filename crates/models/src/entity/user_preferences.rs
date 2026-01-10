use async_graphql::SimpleObject;
use sea_orm::{entity::prelude::*, prelude::async_trait::async_trait, ActiveValue};
use serde::{Deserialize, Serialize};

use crate::shared::{
	arrangement::Arrangement,
	enums::{InterfaceLayout, SupportedFont},
};

#[derive(
	Clone, Debug, PartialEq, DeriveEntityModel, SimpleObject, Serialize, Deserialize,
)]
#[serde(rename_all = "camelCase")]
#[graphql(name = "UserPreferencesModel")]
#[sea_orm(table_name = "user_preferences")]
pub struct Model {
	#[graphql(skip)]
	#[serde(skip)]
	#[sea_orm(primary_key, auto_increment = true)]
	pub id: i32,
	#[sea_orm(column_type = "Text")]
	pub preferred_layout_mode: InterfaceLayout,
	#[sea_orm(column_type = "Text")]
	pub locale: String,
	#[sea_orm(column_type = "Text")]
	pub app_theme: String,
	#[sea_orm(column_type = "Text")]
	pub app_font: SupportedFont,
	#[sea_orm(column_type = "Text")]
	pub primary_navigation_mode: String,
	pub layout_max_width_px: Option<i32>,
	pub show_query_indicator: bool,
	pub enable_live_refetch: bool,
	pub enable_discord_presence: bool,
	pub enable_compact_display: bool,
	pub enable_gradients: bool,
	pub enable_double_sidebar: bool,
	pub enable_replace_primary_sidebar: bool,
	pub enable_hide_scrollbar: bool,
	pub prefer_accent_color: bool,
	pub show_thumbnails_in_headers: bool,
	pub thumbnail_ratio: f32,
	pub enable_job_overlay: bool,
	pub enable_alphabet_select: bool,
	#[graphql(skip)]
	#[sea_orm(column_type = "Json", nullable)]
	#[serde(default = "Model::default_navigation_arrangement")]
	pub navigation_arrangement: Option<Arrangement>,
	#[sea_orm(column_type = "Json", nullable)]
	#[graphql(skip)]
	#[serde(default = "Model::default_home_arrangement")]
	pub home_arrangement: Option<Arrangement>,
	#[sea_orm(column_type = "Text", nullable, unique)]
	pub user_id: Option<String>,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
	#[sea_orm(has_one = "super::user::Entity")]
	User,
}

impl Related<super::user::Entity> for Entity {
	fn to() -> RelationDef {
		Relation::User.def()
	}
}

impl Model {
	pub fn default_navigation_arrangement() -> Option<Arrangement> {
		Some(Arrangement::default_navigation())
	}

	pub fn default_home_arrangement() -> Option<Arrangement> {
		Some(Arrangement::default_home())
	}
}

#[async_trait]
impl ActiveModelBehavior for ActiveModel {
	async fn before_save<C>(mut self, _db: &C, insert: bool) -> Result<Self, DbErr>
	where
		C: ConnectionTrait,
	{
		if insert && self.id.is_not_set() {
			self.preferred_layout_mode = ActiveValue::Set(InterfaceLayout::Grid);
			self.locale = ActiveValue::Set("en".to_string());
			self.app_theme = ActiveValue::Set("system".to_string());
			self.app_font = ActiveValue::Set(SupportedFont::default());
			self.primary_navigation_mode = ActiveValue::Set("SIDEBAR".to_string());
			self.layout_max_width_px = ActiveValue::Set(Some(1280));
			self.show_query_indicator = ActiveValue::Set(false);
			self.enable_live_refetch = ActiveValue::Set(false);
			self.enable_discord_presence = ActiveValue::Set(false);
			self.enable_compact_display = ActiveValue::Set(false);
			self.enable_gradients = ActiveValue::Set(false);
			self.enable_double_sidebar = ActiveValue::Set(true);
			self.enable_replace_primary_sidebar = ActiveValue::Set(false);
			self.enable_hide_scrollbar = ActiveValue::Set(false);
			self.prefer_accent_color = ActiveValue::Set(false);
			self.show_thumbnails_in_headers = ActiveValue::Set(false);
			self.thumbnail_ratio = ActiveValue::Set(1.0 / 1.5);
			self.enable_job_overlay = ActiveValue::Set(true);
			self.enable_alphabet_select = ActiveValue::Set(false);
		}

		Ok(self)
	}
}
