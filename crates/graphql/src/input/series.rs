use async_graphql::InputObject;
use models::{
	entity::series_metadata,
	shared::series_metadata::{CollectedItem, CollectedItems},
};
use sea_orm::{ActiveValue::Set, IntoActiveModel};

#[derive(Debug, Clone, InputObject)]
pub struct SeriesMetadataInput {
	pub age_rating: Option<i32>,
	pub booktype: Option<String>,
	pub characters: Option<Vec<String>>,
	pub collects: Option<Vec<CollectedItem>>,
	pub comic_image: Option<String>,
	pub comicid: Option<i32>,
	pub description_formatted: Option<String>,
	pub genres: Option<Vec<String>>,
	pub imprint: Option<String>,
	pub links: Option<Vec<String>>,
	pub meta_type: Option<String>,
	pub publication_run: Option<String>,
	pub publisher: Option<String>,
	pub status: Option<String>,
	pub summary: Option<String>,
	pub title: Option<String>,
	pub total_issues: Option<i32>,
	pub volume: Option<i32>,
	pub writers: Option<Vec<String>>,
	pub year: Option<i32>,
}

impl IntoActiveModel<series_metadata::ActiveModel> for SeriesMetadataInput {
	fn into_active_model(self) -> series_metadata::ActiveModel {
		series_metadata::ActiveModel {
			age_rating: Set(self.age_rating),
			booktype: Set(self.booktype),
			characters: Set(into_array_string(self.characters)),
			collects: Set(self.collects.map(CollectedItems::from)),
			comic_image: Set(self.comic_image),
			comicid: Set(self.comicid),
			description_formatted: Set(self.description_formatted),
			genres: Set(into_array_string(self.genres)),
			imprint: Set(self.imprint),
			links: Set(into_array_string(self.links)),
			meta_type: Set(self.meta_type),
			publication_run: Set(self.publication_run),
			publisher: Set(self.publisher),
			status: Set(self.status),
			summary: Set(self.summary),
			title: Set(self.title),
			total_issues: Set(self.total_issues),
			volume: Set(self.volume),
			writers: Set(into_array_string(self.writers)),
			year: Set(self.year),
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
