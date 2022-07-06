// Note: I wanted to separate this from the types::models crate just because these
// won't be used throughout the app but really just this crate.

use crate::prisma::{media, series};

pub struct OpdsSeries {
	pub id: String,
	pub name: String,
	pub path: String,
	pub media: Vec<media::Data>,

	pub current_page: usize,
	pub next_page: Option<usize>,
}

impl From<((series::Data, Vec<media::Data>), (usize, Option<usize>))> for OpdsSeries {
	fn from(payload: ((series::Data, Vec<media::Data>), (usize, Option<usize>))) -> Self {
		let ((series, media), (current_page, next_page)) = payload;

		OpdsSeries {
			id: series.id,
			name: series.name,
			path: series.path,
			media,
			current_page,
			next_page,
		}
	}
}
