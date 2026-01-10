use async_graphql::InputObject;
use models::entity::series_metadata;
use sea_orm::{ActiveValue::Set, IntoActiveModel};

#[derive(Debug, Clone, InputObject)]
pub struct SeriesMetadataInput {
	pub age_rating: Option<i32>,
	pub booktype: Option<String>,
	pub characters: Option<Vec<String>>,
	pub comicid: Option<i32>,
	pub genres: Option<Vec<String>>,
	pub imprint: Option<String>,
	pub links: Option<Vec<String>>,
	pub meta_type: Option<String>,
	pub publisher: Option<String>,
	pub status: Option<String>,
	pub summary: Option<String>,
	pub title: Option<String>,
	pub volume: Option<i32>,
	pub writers: Option<Vec<String>>,
}

impl IntoActiveModel<series_metadata::ActiveModel> for SeriesMetadataInput {
	fn into_active_model(self) -> series_metadata::ActiveModel {
		series_metadata::ActiveModel {
			age_rating: Set(self.age_rating),
			booktype: Set(self.booktype),
			characters: Set(into_array_string(self.characters)),
			comicid: Set(self.comicid),
			genres: Set(into_array_string(self.genres)),
			imprint: Set(self.imprint),
			links: Set(into_array_string(self.links)),
			meta_type: Set(self.meta_type),
			publisher: Set(self.publisher),
			status: Set(self.status),
			summary: Set(self.summary),
			title: Set(self.title),
			volume: Set(self.volume),
			writers: Set(into_array_string(self.writers)),
			..Default::default()
		}
	}
}

fn into_array_string(s: Option<Vec<String>>) -> Option<String> {
	match s {
		Some(v) if !v.is_empty() => Some(v.join(", ")),
		_ => None,
	}
}
