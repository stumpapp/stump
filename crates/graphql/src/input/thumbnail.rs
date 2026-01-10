use async_graphql::InputObject;

#[derive(Debug, Default, InputObject)]
pub struct PageBasedThumbnailInput {
	/// The page to pull inside the media file for generating the thumbnail
	page: i32,
	#[graphql(default)]
	/// A flag indicating whether the page is zero based (i.e. 0 is the first page)
	is_zero_based: Option<bool>,
}

impl PageBasedThumbnailInput {
	pub fn page(&self) -> i32 {
		self.is_zero_based.map_or(self.page, |is_zero_based| {
			if is_zero_based {
				self.page + 1
			} else {
				self.page
			}
		})
	}
}

#[derive(Debug, Default, InputObject)]
pub struct UpdateThumbnailInput {
	/// The ID of the media inside the series to fetch
	pub media_id: String,
	#[graphql(flatten)]
	pub params: PageBasedThumbnailInput,
}
