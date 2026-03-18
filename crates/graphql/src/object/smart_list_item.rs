use async_graphql::{SimpleObject, Union};

use crate::object::{library::Library, media::Media, series::Series};

#[derive(Debug, Clone, SimpleObject)]
pub struct GenericGroupingValue {
	pub key: String,
}

#[derive(Debug, Clone, Union)]
pub enum SmartListItemEntity {
	Series(Box<Series>),
	Library(Box<Library>),
	Generic(GenericGroupingValue),
}

#[derive(Debug, SimpleObject)]
pub struct SmartListGroupedItem {
	pub entity: SmartListItemEntity,
	pub books: Vec<Media>,
	pub subgroups: Option<Vec<SmartListGroupedItem>>,
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
