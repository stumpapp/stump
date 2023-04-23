use std::str::FromStr;

use serde::{Deserialize, Serialize};
use specta::Type;
use utoipa::ToSchema;

use crate::{
	db::models::Media,
	prisma::{reading_list, reading_list_item},
};

use super::Cursor;

#[derive(Default, Debug, Clone, Serialize, Deserialize, Type, ToSchema)]
pub enum ReadingListVisibility {
	#[serde(rename = "PUBLIC")]
	Public,
	#[serde(rename = "PRIVATE")]
	#[default]
	Private,
	#[serde(rename = "SHARED")]
	Shared,
}

impl FromStr for ReadingListVisibility {
	type Err = ();

	fn from_str(s: &str) -> Result<Self, Self::Err> {
		match s {
			"PUBLIC" => Ok(ReadingListVisibility::Public),
			"PRIVATE" => Ok(ReadingListVisibility::Private),
			"SHARED" => Ok(ReadingListVisibility::Shared),
			_ => Err(()),
		}
	}
}

impl std::fmt::Display for ReadingListVisibility {
	fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
		match self {
			ReadingListVisibility::Public => write!(f, "PUBLIC"),
			ReadingListVisibility::Private => write!(f, "PRIVATE"),
			ReadingListVisibility::Shared => write!(f, "SHARED"),
		}
	}
}

#[derive(Debug, Clone, Serialize, Deserialize, Type, ToSchema, Default)]
pub struct ReadingListItem {
	pub display_order: i32,
	pub media_id: String,
	pub reading_list_id: String,
	pub media: Option<Media>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type, ToSchema, Default)]
pub struct ReadingList {
	pub id: String,
	pub name: String,
	pub creating_user_id: String,
	pub visibility: ReadingListVisibility,
	pub description: Option<String>,
	pub items: Option<Vec<ReadingListItem>>,
}

impl Cursor for ReadingList {
	fn cursor(&self) -> String {
		self.id.clone()
	}
}

impl From<reading_list_item::Data> for ReadingListItem {
	fn from(data: reading_list_item::Data) -> ReadingListItem {
		let media = match data.media() {
			Ok(m) => m.map(|m| Media::from(m.to_owned())),
			Err(_) => None,
		};

		ReadingListItem {
			display_order: data.display_order,
			media_id: data.media_id,
			reading_list_id: data.reading_list_id,
			media,
		}
	}
}

impl From<reading_list::Data> for ReadingList {
	fn from(data: reading_list::Data) -> ReadingList {
		let items = data
			.items
			.map(|items| items.into_iter().map(ReadingListItem::from).collect());

		ReadingList {
			id: data.id,
			name: data.name,
			creating_user_id: data.creating_user_id,
			visibility: ReadingListVisibility::from_str(&data.visibility)
				.expect("Invalid visibility"),
			description: data.description,
			items,
		}
	}
}

impl From<(reading_list::Data, Vec<reading_list_item::Data>)> for ReadingList {
	fn from(data: (reading_list::Data, Vec<reading_list_item::Data>)) -> ReadingList {
		let items = data.1.into_iter().map(ReadingListItem::from).collect();

		ReadingList {
			items: Some(items),
			..ReadingList::from(data.0)
		}
	}
}
