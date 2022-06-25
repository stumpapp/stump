use rocket_okapi::JsonSchema;
use serde::Serialize;

#[derive(Serialize, FromForm, JsonSchema)]
pub struct PagedRequestParams {
	pub zero_based: Option<bool>,
	pub page: Option<u32>,
	pub page_size: Option<u32>,
}

#[derive(Debug, Serialize, JsonSchema)]
pub struct PageParams {
	pub zero_based: bool,
	pub page: u32,
	pub page_size: u32,
}

impl Default for PageParams {
	fn default() -> Self {
		PageParams {
			zero_based: false,
			page: 0,
			page_size: 20,
		}
	}
}

impl From<Option<PagedRequestParams>> for PageParams {
	fn from(req_params: Option<PagedRequestParams>) -> Self {
		match req_params {
			Some(params) => {
				let zero_based = params.zero_based.unwrap_or(false);
				let page_size = params.page_size.unwrap_or(20);

				let default_page = if zero_based { 0 } else { 1 };

				let page = params.page.unwrap_or(default_page);

				PageParams {
					page,
					page_size,
					zero_based,
				}
			},
			None => PageParams::default(),
		}
	}
}

#[derive(Serialize, JsonSchema)]
pub struct PageLinks {
	/// The current request URL. E.g. http://example.com/api/v1/users?page=2
	#[serde(rename = "self")]
	pub itself: String,
	/// The start URL, relative to current paginated request URL. E.g. http://example.com/api/v1/users?page=0
	pub start: String,
	/// The prev URL, relative to current paginated request URL. E.g. http://example.com/api/v1/users?page=1
	pub prev: Option<String>,
	/// The next URL, relative to current paginated request URL. E.g. http://example.com/api/v1/users?page=3
	pub next: Option<String>,
}

#[derive(Serialize, JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct PageInfo {
	/// The number of pages available.
	pub total_pages: u32,
	/// The current page, zero-indexed.
	pub current_page: u32,
	/// The number of elements per page.
	pub page_size: u32,
	/// The offset of the current page. E.g. if current page is 1, and pageSize is 10, the offset is 20.
	pub page_offset: u32,
	/// Whether or not the page is zero-indexed.
	pub zero_based: bool,
}

impl PageInfo {
	pub fn new(page_params: PageParams, total_pages: u32) -> Self {
		let current_page = page_params.page.try_into().unwrap();
		let page_size = page_params.page_size.try_into().unwrap();
		let zero_based = page_params.zero_based;

		PageInfo {
			total_pages,
			current_page,
			page_size,
			page_offset: current_page * page_size,
			zero_based,
		}
	}
}

#[derive(Serialize, JsonSchema)]
pub struct Pageable<T: Serialize> {
	/// The target data being returned.
	pub data: T,
	/// The pagination information (if paginated).
	pub _page: Option<PageInfo>,
	// FIXME: removing for now.
	// /// The links to other pages (if paginated).
	// pub _links: Option<PageLinks>,
}

impl<T: Serialize> Pageable<T> {
	pub fn unpaged(data: T) -> Self {
		Pageable {
			data,
			_page: None,
			// _links: None,
		}
	}

	pub fn new(data: T, page_info: PageInfo) -> Self {
		Pageable {
			data,
			_page: Some(page_info),
		}
	}
}

impl<T> Into<Pageable<Vec<T>>> for Vec<T>
where
	T: Serialize + Clone,
{
	fn into(self) -> Pageable<Vec<T>> {
		Pageable::unpaged(self)
	}
}

impl<T> Into<Pageable<Vec<T>>> for (Vec<T>, PageParams)
where
	T: Serialize + Clone,
{
	fn into(self) -> Pageable<Vec<T>> {
		let (mut data, page_params) = self;

		let total_pages =
			(data.len() as f32 / page_params.page_size as f32).ceil() as u32;

		let start = match page_params.zero_based {
			true => page_params.page * page_params.page_size,
			false => (page_params.page - 1) * page_params.page_size,
		};

		// let start = page_params.page * page_params.page_size;
		let end = start + page_params.page_size;

		// println!("len:{}, start: {}, end: {}", data.len(), start, end);

		if start > data.len() as u32 {
			data = vec![];
		} else if end < data.len() as u32 {
			data = data
				.get((start as usize)..(end as usize))
				.ok_or("Invalid page")
				.unwrap()
				.to_vec();
		} else {
			data = data
				.get((start as usize)..)
				.ok_or("Invalid page")
				.unwrap()
				.to_vec();
		}

		Pageable::new(data, PageInfo::new(page_params, total_pages))
	}
}

impl<T> Into<Pageable<Vec<T>>> for (Vec<T>, Option<PagedRequestParams>)
where
	T: Serialize + Clone,
{
	fn into(self) -> Pageable<Vec<T>> {
		(self.0, PageParams::from(self.1)).into()
	}
}
