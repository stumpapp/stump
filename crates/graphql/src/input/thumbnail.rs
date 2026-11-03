use async_graphql::{InputObject, Result};

#[derive(Debug, Default, InputObject)]
pub struct PageBasedThumbnailInput {
	/// The page to pull inside the media file for generating the thumbnail
	page: i32,
	#[graphql(default)]
	/// A flag indicating whether the page is zero based (i.e. 0 is the first page)
	is_zero_based: Option<bool>,
}

impl PageBasedThumbnailInput {
	fn page(&self) -> i32 {
		self.is_zero_based.map_or(self.page, |is_zero_based| {
			if is_zero_based {
				self.page + 1
			} else {
				self.page
			}
		})
	}

	/// Validates the page for a book with this extension. Pages start at 1, and EPUB pages
	/// after the cover are chapters, which can't be used as a thumbnail
	pub fn page_for(&self, extension: &str) -> Result<i32> {
		let page = self.page();
		if page < 1 {
			return Err("Invalid page".into());
		}
		if extension.eq_ignore_ascii_case("epub") && page > 1 {
			return Err("Cannot set thumbnail from EPUB chapter".into());
		}
		Ok(page)
	}
}

#[derive(Debug, Default, InputObject)]
pub struct UpdateThumbnailInput {
	/// The ID of the media inside the series to fetch
	pub media_id: String,
	#[graphql(flatten)]
	pub params: PageBasedThumbnailInput,
}

#[cfg(test)]
mod tests {
	use super::*;

	fn input(page: i32, is_zero_based: Option<bool>) -> PageBasedThumbnailInput {
		PageBasedThumbnailInput {
			page,
			is_zero_based,
		}
	}

	#[test]
	fn test_page_for() {
		assert_eq!(input(1, None).page_for("epub").unwrap(), 1);
		assert_eq!(input(0, Some(true)).page_for("EPUB").unwrap(), 1);
		assert!(input(2, None).page_for("epub").is_err());
		assert!(input(1, Some(true)).page_for("EPUB").is_err());
		assert_eq!(input(2, None).page_for("cbz").unwrap(), 2);
		assert!(input(0, None).page_for("cbz").is_err());
		assert!(input(-1, Some(true)).page_for("cbz").is_err());
	}
}
