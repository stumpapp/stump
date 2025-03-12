use sea_orm::entity::prelude::*;

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Eq)]
#[sea_orm(table_name = "user_preferences")]
pub struct Model {
	#[sea_orm(primary_key, auto_increment = false, column_type = "Text")]
	pub id: String,
	#[sea_orm(column_type = "Text")]
	pub preferred_layout_mode: String,
	#[sea_orm(column_type = "Text")]
	pub locale: String,
	#[sea_orm(column_type = "Text")]
	pub app_theme: String,
	#[sea_orm(column_type = "Text")]
	pub app_font: String,
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
	pub enable_job_overlay: bool,
	pub enable_alphabet_select: bool,
	#[sea_orm(column_type = "Blob", nullable)]
	pub navigation_arrangement: Option<Vec<u8>>,
	#[sea_orm(column_type = "Blob", nullable)]
	pub home_arrangement: Option<Vec<u8>>,
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

impl ActiveModelBehavior for ActiveModel {}
