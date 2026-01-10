use async_graphql::{SimpleObject, Union};

use crate::object::{library::Library, media::Media, series::Series};

#[derive(Debug, Union)]
pub enum SmartListItemEntity {
	Series(Box<Series>),
	Library(Box<Library>),
}

#[derive(Debug, SimpleObject)]
pub struct SmartListGroupedItem {
	pub entity: SmartListItemEntity,
	pub books: Vec<Media>,
}

#[derive(Debug, SimpleObject)]
pub struct SmartListGrouped {
	pub items: Vec<SmartListGroupedItem>,
}

#[derive(Debug, SimpleObject)]
pub struct SmartListUngrouped {
	pub books: Vec<Media>,
}

#[derive(Debug, Union)]
pub enum SmartListItems {
	Grouped(SmartListGrouped),
	Ungrouped(SmartListUngrouped),
}
