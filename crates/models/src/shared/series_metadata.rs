use async_graphql::{InputObject, SimpleObject};
use sea_orm::FromJsonQueryResult;
use serde::{Deserialize, Serialize};

/// Represents a collected issue/series within a TPB or GN
/// See https://github.com/mylar3/mylar3/wiki/series.json-schema-%28version-1.0.1%29
#[derive(
	Clone, Debug, PartialEq, Eq, Deserialize, Serialize, SimpleObject, InputObject,
)]
#[graphql(input_name = "CollectedItemInput")]
pub struct CollectedItem {
	/// The title of the series
	pub series: Option<String>,
	/// CV ComicID of series
	pub comicid: Option<String>,
	/// CV IssueID of single issue (not valid if multiple issues)
	pub issueid: Option<String>,
	/// Listing of issue numbers present pertaining to related comicid in collection
	pub issues: Option<String>,
}

#[derive(Clone, Debug, PartialEq, Eq, Deserialize, Serialize, FromJsonQueryResult)]
pub struct CollectedItems(pub Vec<CollectedItem>);

impl From<Vec<CollectedItem>> for CollectedItems {
	fn from(items: Vec<CollectedItem>) -> Self {
		Self(items)
	}
}

impl From<CollectedItems> for Vec<CollectedItem> {
	fn from(items: CollectedItems) -> Self {
		items.0
	}
}
