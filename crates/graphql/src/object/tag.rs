use async_graphql::SimpleObject;
use models::entity::tag;

#[derive(Debug, SimpleObject, PartialEq, Eq, PartialOrd, Ord)]
pub struct Tag {
	#[graphql(flatten)]
	pub model: tag::Model,
}

impl From<tag::Model> for Tag {
	fn from(entity: tag::Model) -> Self {
		Self { model: entity }
	}
}

/// A tag scoped to a library, along with the number of books in that
/// library which have the tag applied
#[derive(Debug, SimpleObject, PartialEq, Eq)]
pub struct LibraryTag {
	pub id: i32,
	pub name: String,
	/// The number of books in the library with this tag applied
	pub count: i64,
}
