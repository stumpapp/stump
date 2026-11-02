//! OPDS text localization.
//!
//! OPDS responses are consumed by external clients, so the web UI's i18n
//! bundle cannot be reused here. The locale is taken from the authenticated
//! user's preferences and falls back to English.

#[derive(Debug, Clone, Copy, Default, PartialEq, Eq)]
pub enum Locale {
	#[default]
	En,
	ZhCn,
}

impl Locale {
	pub fn from_preference(value: &str) -> Self {
		let value = value.replace('_', "-").to_ascii_lowercase();
		if value == "zh" || value.starts_with("zh-cn") || value.starts_with("zh-hans") {
			Self::ZhCn
		} else {
			Self::En
		}
	}
}

pub struct CatalogEntry {
	pub title: &'static str,
	pub description: &'static str,
}

pub struct Text {
	pub catalog: &'static str,
	pub catalog_v2: &'static str,
	pub keep_reading: CatalogEntry,
	pub all_series: CatalogEntry,
	pub latest_series: CatalogEntry,
	pub all_libraries: CatalogEntry,
	pub all_books: CatalogEntry,
	pub latest_books: CatalogEntry,
	pub search_results: &'static str,
	pub keep_reading_feed: &'static str,
	pub all_series_feed: &'static str,
	pub latest_series_feed: &'static str,
	pub all_books_feed: &'static str,
	pub latest_books_feed: &'static str,
	pub libraries: &'static str,
	pub series: &'static str,
	pub books: &'static str,
	pub currently_reading: &'static str,
	pub browse_libraries: &'static str,
	pub browse_series: &'static str,
	pub browse_books: &'static str,
	pub library_books_all: &'static str,
	pub library_books_latest: &'static str,
	pub library_series: &'static str,
	pub series_suffix: &'static str,
	pub series_fallback_prefix: &'static str,
	pub search: &'static str,
}

const EN: Text = Text {
	catalog: "Stump OPDS catalog",
	catalog_v2: "Stump OPDS V2 Catalog",
	keep_reading: CatalogEntry {
		title: "Keep reading",
		description: "Continue reading your in progress books",
	},
	all_series: CatalogEntry {
		title: "All series",
		description: "Browse by series",
	},
	latest_series: CatalogEntry {
		title: "Latest series",
		description: "Browse latest series",
	},
	all_libraries: CatalogEntry {
		title: "All libraries",
		description: "Browse by library",
	},
	all_books: CatalogEntry {
		title: "All books",
		description: "Browse all books",
	},
	latest_books: CatalogEntry {
		title: "Latest books",
		description: "Browse latest books",
	},
	search_results: "Search Results",
	keep_reading_feed: "Keep Reading",
	all_series_feed: "All Series",
	latest_series_feed: "Latest Series",
	all_books_feed: "All Books",
	latest_books_feed: "Latest Books",
	libraries: "Libraries",
	series: "Series",
	books: "Books",
	currently_reading: "Currently Reading",
	browse_libraries: "Browse Libraries",
	browse_series: "Browse Series",
	browse_books: "Browse Books",
	library_books_all: "Library Books - All",
	library_books_latest: "Library Books - Latest",
	library_series: "Library Series",
	series_suffix: "Series",
	series_fallback_prefix: "Series ",
	search: "Search",
};

const ZH_CN: Text = Text {
	catalog: "Stump OPDS 目录",
	catalog_v2: "Stump OPDS V2 目录",
	keep_reading: CatalogEntry {
		title: "继续阅读",
		description: "继续阅读你正在读的书",
	},
	all_series: CatalogEntry {
		title: "全部系列",
		description: "按系列浏览",
	},
	latest_series: CatalogEntry {
		title: "最新系列",
		description: "浏览最新系列",
	},
	all_libraries: CatalogEntry {
		title: "全部书库",
		description: "按书库浏览",
	},
	all_books: CatalogEntry {
		title: "全部书籍",
		description: "浏览全部书籍",
	},
	latest_books: CatalogEntry {
		title: "最新书籍",
		description: "浏览最新书籍",
	},
	search_results: "搜索结果",
	keep_reading_feed: "继续阅读",
	all_series_feed: "全部系列",
	latest_series_feed: "最新系列",
	all_books_feed: "全部书籍",
	latest_books_feed: "最新书籍",
	libraries: "书库",
	series: "系列",
	books: "书籍",
	currently_reading: "正在阅读",
	browse_libraries: "浏览书库",
	browse_series: "浏览系列",
	browse_books: "浏览书籍",
	library_books_all: "书库书籍 - 全部",
	library_books_latest: "书库书籍 - 最新",
	library_series: "书库系列",
	series_suffix: "系列",
	series_fallback_prefix: "系列 ",
	search: "搜索",
};

pub fn text(locale: Locale) -> &'static Text {
	match locale {
		Locale::En => &EN,
		Locale::ZhCn => &ZH_CN,
	}
}

#[cfg(test)]
mod tests {
	use super::*;

	#[test]
	fn resolves_simplified_chinese() {
		assert_eq!(Locale::from_preference("zh-CN"), Locale::ZhCn);
		assert_eq!(Locale::from_preference("zh_Hans"), Locale::ZhCn);
		assert_eq!(Locale::from_preference("en-US"), Locale::En);
	}

	#[test]
	fn translates_catalog_titles() {
		let zh = text(Locale::ZhCn);
		assert_eq!(zh.libraries, "书库");
		assert_eq!(zh.all_series.title, "全部系列");
	}
}
