use async_graphql::{InputObject, OneofObject};
use models::entity::{bookmark, media_metadata, user::AuthUser};
use sea_orm::{prelude::*, ActiveValue::Set, IntoActiveModel};

#[derive(Debug, Clone, InputObject)]
pub struct EpubProgressInput {
	pub epubcfi: String,
	pub percentage: Option<Decimal>,
	pub is_complete: Option<bool>,
	pub elapsed_seconds: Option<i64>,
}

#[derive(Debug, Clone, InputObject)]
pub struct PagedProgressInput {
	pub page: i32,
	pub elapsed_seconds: Option<i64>,
}

#[derive(Debug, Clone, OneofObject)]
pub enum MediaProgressInput {
	Epub(EpubProgressInput),
	Paged(PagedProgressInput),
}

#[derive(InputObject)]
pub struct BookmarkInput {
	pub media_id: String,
	pub epubcfi: String,
	pub preview_content: Option<String>,
}

impl BookmarkInput {
	pub fn into_active_model(&self, user: &AuthUser) -> bookmark::ActiveModel {
		bookmark::ActiveModel {
			id: Set(Uuid::new_v4().to_string()),
			epubcfi: Set(Some(self.epubcfi.clone())),
			preview_content: Set(self.preview_content.clone()),
			media_id: Set(self.media_id.clone()),
			user_id: Set(user.id.clone()),
			page: Set(Some(-1)),
		}
	}
}

#[derive(Debug, Clone, InputObject)]
pub struct MediaMetadataInput {
	pub title: Option<String>,
	pub title_sort: Option<String>,
	pub series: Option<String>,
	pub number: Option<Decimal>,
	pub volume: Option<i32>,
	pub summary: Option<String>,
	pub notes: Option<String>,
	pub genres: Option<Vec<String>>,
	pub year: Option<i32>,
	pub month: Option<i32>,
	pub day: Option<i32>,
	pub writers: Option<Vec<String>>,
	pub pencillers: Option<Vec<String>>,
	pub inkers: Option<Vec<String>>,
	pub colorists: Option<Vec<String>>,
	pub letterers: Option<Vec<String>>,
	pub cover_artists: Option<Vec<String>>,
	pub editors: Option<Vec<String>>,
	pub publisher: Option<String>,
	pub links: Option<Vec<String>>,
	pub characters: Option<Vec<String>>,
	pub teams: Option<Vec<String>>,
	pub page_count: Option<i32>,
	pub age_rating: Option<i32>,
	pub identifier_amazon: Option<String>,
	pub identifier_calibre: Option<String>,
	pub identifier_google: Option<String>,
	pub identifier_isbn: Option<String>,
	pub identifier_mobi_asin: Option<String>,
	pub identifier_uuid: Option<String>,
	pub language: Option<String>,
}

impl IntoActiveModel<media_metadata::ActiveModel> for MediaMetadataInput {
	fn into_active_model(self) -> media_metadata::ActiveModel {
		media_metadata::ActiveModel {
			title: Set(self.title),
			title_sort: Set(self.title_sort),
			series: Set(self.series),
			number: Set(self.number),
			volume: Set(self.volume),
			summary: Set(self.summary),
			notes: Set(self.notes),
			genres: Set(into_array_string(self.genres)),
			year: Set(self.year),
			month: Set(self.month),
			day: Set(self.day),
			writers: Set(into_array_string(self.writers)),
			pencillers: Set(into_array_string(self.pencillers)),
			inkers: Set(into_array_string(self.inkers)),
			colorists: Set(into_array_string(self.colorists)),
			letterers: Set(into_array_string(self.letterers)),
			cover_artists: Set(into_array_string(self.cover_artists)),
			editors: Set(into_array_string(self.editors)),
			publisher: Set(self.publisher),
			links: Set(into_array_string(self.links)),
			characters: Set(into_array_string(self.characters)),
			teams: Set(into_array_string(self.teams)),
			page_count: Set(self.page_count),
			age_rating: Set(self.age_rating),
			identifier_amazon: Set(self.identifier_amazon),
			identifier_calibre: Set(self.identifier_calibre),
			identifier_google: Set(self.identifier_google),
			identifier_isbn: Set(self.identifier_isbn),
			identifier_mobi_asin: Set(self.identifier_mobi_asin),
			identifier_uuid: Set(self.identifier_uuid),
			language: Set(self.language),
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
