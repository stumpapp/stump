use async_graphql::InputObject;
use models::entity::series_metadata;
use sea_orm::{ActiveValue::Set, IntoActiveModel};

#[derive(Debug, Clone, InputObject)]
pub struct SeriesMetadataInput {
	pub meta_type: Option<String>,
	pub title: Option<String>,
	pub summary: Option<String>,
	pub publisher: Option<String>,
	pub imprint: Option<String>,
	pub comicid: Option<i32>,
	pub volume: Option<i32>,
	pub booktype: Option<String>,
	pub age_rating: Option<i32>,
	pub status: Option<String>,
}

impl IntoActiveModel<series_metadata::ActiveModel> for SeriesMetadataInput {
	fn into_active_model(self) -> series_metadata::ActiveModel {
		series_metadata::ActiveModel {
			meta_type: Set(self.meta_type),
			title: Set(self.title),
			summary: Set(self.summary),
			publisher: Set(self.publisher),
			imprint: Set(self.imprint),
			comicid: Set(self.comicid),
			volume: Set(self.volume),
			booktype: Set(self.booktype),
			age_rating: Set(self.age_rating),
			status: Set(self.status),
			..Default::default()
		}
	}
}
