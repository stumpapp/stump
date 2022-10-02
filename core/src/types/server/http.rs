use serde::Serialize;

/// [`ContentType`] is an enum that represents the HTTP content type. This is a smaller
/// subset of the full list of content types, mostly focusing on types supported by Stump.
#[allow(non_camel_case_types)]
#[derive(Serialize, Debug, Clone, Copy, PartialEq)]
pub enum ContentType {
	XHTML,
	XML,
	HTML,
	PDF,
	EPUB_ZIP,
	ZIP,
	COMIC_ZIP,
	RAR,
	COMIC_RAR,
	PNG,
	JPEG,
	WEBP,
	GIF,
	UNKNOWN,
}

impl ContentType {
	/// Returns the content type from the file extension.
	///
	/// ## Examples
	/// ```rust
	/// use stump_core::types::server::http::ContentType;
	///
	/// fn main() {
	///     let content_type = ContentType::from_extension("png");
	///     assert_eq!(content_type, Some(ContentType::PNG));
	/// }
	pub fn from_extension(extension: &str) -> Option<ContentType> {
		match extension.to_lowercase().as_str() {
			"xhtml" => Some(ContentType::XHTML),
			"xml" => Some(ContentType::XML),
			"html" => Some(ContentType::HTML),
			"pdf" => Some(ContentType::PDF),
			"epub" => Some(ContentType::EPUB_ZIP),
			"zip" => Some(ContentType::ZIP),
			"cbz" => Some(ContentType::COMIC_ZIP),
			"rar" => Some(ContentType::RAR),
			"cbr" => Some(ContentType::COMIC_RAR),
			"png" => Some(ContentType::PNG),
			"jpg" => Some(ContentType::JPEG),
			"jpeg" => Some(ContentType::JPEG),
			"webp" => Some(ContentType::WEBP),
			"gif" => Some(ContentType::GIF),
			_ => None,
		}
	}

	/// Returns true if the content type is an image.
	///
	/// # Examples
	/// ```rust
	/// use stump_core::types::server::http::ContentType;
	///
	/// fn main() {
	///     let content_type = ContentType::PNG;
	///     assert!(content_type.is_image());
	///
	///     let content_type = ContentType::XHTML;
	///     assert!(!content_type.is_image());
	/// }
	/// ```
	pub fn is_image(&self) -> bool {
		self.to_string().starts_with("image")
	}
}

impl From<&str> for ContentType {
	fn from(s: &str) -> Self {
		match s.to_lowercase().as_str() {
			"application/xhtml+xml" => ContentType::XHTML,
			"application/xml" => ContentType::XML,
			"text/html" => ContentType::HTML,
			"application/pdf" => ContentType::PDF,
			"application/epub+zip" => ContentType::EPUB_ZIP,
			"application/zip" => ContentType::ZIP,
			"application/vnd.comicbook+zip" => ContentType::COMIC_ZIP,
			"application/vnd.rar" => ContentType::RAR,
			"application/vnd.comicbook-rar" => ContentType::COMIC_RAR,
			"image/png" => ContentType::PNG,
			"image/jpeg" => ContentType::JPEG,
			"image/webp" => ContentType::WEBP,
			"image/gif" => ContentType::GIF,
			_ => ContentType::UNKNOWN,
		}
	}
}

impl std::fmt::Display for ContentType {
	fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
		match self {
			ContentType::XHTML => write!(f, "application/xhtml+xml"),
			ContentType::XML => write!(f, "application/xml"),
			ContentType::HTML => write!(f, "text/html"),
			ContentType::PDF => write!(f, "application/pdf"),
			ContentType::EPUB_ZIP => write!(f, "application/epub+zip"),
			ContentType::ZIP => write!(f, "application/zip"),
			ContentType::COMIC_ZIP => write!(f, "application/vnd.comicbook+zip"),
			ContentType::RAR => write!(f, "application/vnd.rar"),
			ContentType::COMIC_RAR => write!(f, "application/vnd.comicbook-rar"),
			ContentType::PNG => write!(f, "image/png"),
			ContentType::JPEG => write!(f, "image/jpeg"),
			ContentType::WEBP => write!(f, "image/webp"),
			ContentType::GIF => write!(f, "image/gif"),
			ContentType::UNKNOWN => write!(f, "unknown"),
		}
	}
}
