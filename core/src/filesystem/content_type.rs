use std::path::Path;

use models::shared::image_processor_options::SupportedImageFormat;
use serde::Serialize;

use crate::CoreError;

/// [`ContentType`] is an enum that represents the HTTP content type. This is a smaller
/// subset of the full list of content types, mostly focusing on types supported by Stump.
#[allow(non_camel_case_types)]
#[derive(Serialize, Debug, Clone, Copy, PartialEq, Eq, Default)]
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
	AVIF,
	HEIF,
	PNG,
	JPEG,
	JPEG_XL,
	WEBP,
	GIF,
	TXT,
	#[default]
	UNKNOWN,
}

fn temporary_content_workarounds(extension: &str) -> ContentType {
	if extension == "opf" || extension == "ncx" {
		return ContentType::XML;
	}

	ContentType::UNKNOWN
}

fn infer_mime_from_bytes(bytes: &[u8]) -> Option<String> {
	infer::get(bytes).map(|infer_type| infer_type.mime_type().to_string())
}

fn infer_mime(path: &Path) -> Option<String> {
	match infer::get_from_path(path) {
		Ok(result) => {
			tracing::trace!(?path, ?result, "inferred mime");
			result.map(|infer_type| infer_type.mime_type().to_string())
		},
		Err(e) => {
			tracing::trace!(error = ?e, ?path, "infer failed");
			None
		},
	}
}

impl ContentType {
	/// Infer the MIME type of a file extension.
	///
	/// ### Example
	/// ```no_run
	/// use stump_core::filesystem::ContentType;
	///
	/// let content_type = ContentType::from_extension("png");
	/// assert_eq!(content_type, ContentType::PNG);
	/// ```
	pub fn from_extension(extension: &str) -> ContentType {
		match extension.to_lowercase().as_str() {
			"xhtml" => ContentType::XHTML,
			"xml" => ContentType::XML,
			"html" => ContentType::HTML,
			"pdf" => ContentType::PDF,
			"epub" => ContentType::EPUB_ZIP,
			"zip" => ContentType::ZIP,
			"cbz" => ContentType::COMIC_ZIP,
			"rar" => ContentType::RAR,
			"cbr" => ContentType::COMIC_RAR,
			"avif" => ContentType::AVIF,
			"heif" => ContentType::HEIF,
			"png" => ContentType::PNG,
			"jpg" => ContentType::JPEG,
			"jpeg" => ContentType::JPEG,
			"jxl" => ContentType::JPEG_XL,
			"webp" => ContentType::WEBP,
			"gif" => ContentType::GIF,
			"txt" => ContentType::TXT,
			_ => temporary_content_workarounds(extension),
		}
	}

	/// Infer the MIME type of a file using the [`infer`] crate. If the MIME type cannot be inferred,
	/// then the file extension is used to determine the content type.
	///
	/// ### Example
	/// ```no_run
	/// use stump_core::filesystem::ContentType;
	///
	/// let content_type = ContentType::from_file("test.png");
	/// assert_eq!(content_type, ContentType::PNG);
	/// ```
	pub fn from_file(file_path: &str) -> ContentType {
		let path = Path::new(file_path);
		ContentType::from_path(path)
	}

	/// Infer the MIME type of a [`Vec`] of bytes using the [`infer`] crate. If the MIME type cannot be
	/// inferred, then the content type is set to [`ContentType::UNKNOWN`].
	///
	/// ### Example
	/// ```no_run
	/// use stump_core::filesystem::ContentType;
	///
	/// let buf = [0xFF, 0xD8, 0xFF, 0xAA];
	/// let content_type = ContentType::from_bytes(&buf);
	/// assert_eq!(content_type, ContentType::JPEG);
	/// ```
	pub fn from_bytes(bytes: &[u8]) -> ContentType {
		infer_mime_from_bytes(bytes)
			.map(|mime| ContentType::from(mime.as_str()))
			.unwrap_or_default()
	}

	/// Infer the MIME type of a [`Vec`] of bytes using the [`infer`] crate. If the MIME type cannot be
	/// inferred, then the extension is used to determine the content type.
	///
	/// ### Example
	/// ```no_run
	/// use stump_core::filesystem::ContentType;
	///
	/// // This is NOT a valid PNG buff
	/// let buf = [0xFF, 0xD8, 0xBB, 0xBB];
	/// let content_type = ContentType::from_bytes_with_fallback(&buf, "png");
	/// assert_eq!(content_type, ContentType::PNG);
	/// ```
	pub fn from_bytes_with_fallback(bytes: &[u8], extension: &str) -> ContentType {
		infer_mime_from_bytes(bytes)
			.map(|mime| ContentType::from(mime.as_str()))
			.unwrap_or_else(|| {
				// NOTE: I am logging at warn level because inference from bytes is a little more
				// accurate, so if it fails it may be indicative of a problem.
				tracing::warn!(
					?bytes,
					?extension,
					"failed to infer content type, falling back to extension"
				);
				ContentType::from_extension(extension)
			})
	}

	/// Infer the MIME type of a [Path] using the [infer] crate. If the MIME type cannot be inferred,
	/// then the extension of the path is used to determine the content type.
	///
	/// ### Example
	/// ```no_run
	/// use stump_core::filesystem::ContentType;
	/// use std::path::Path;
	///
	/// let path = Path::new("test.png");
	/// let content_type = ContentType::from_path(path);
	/// assert_eq!(content_type, ContentType::PNG);
	/// ```
	pub fn from_path(path: &Path) -> ContentType {
		infer_mime(path)
			.map(|mime| ContentType::from(mime.as_str()))
			.unwrap_or_else(|| {
				ContentType::from_extension(
					path.extension()
						.unwrap_or_default()
						.to_str()
						.unwrap_or_default(),
				)
			})
	}

	/// Returns the string representation of the MIME type.
	pub fn mime_type(&self) -> String {
		self.to_string()
	}

	/// Returns true if the content type is an image.
	///
	/// ## Example
	/// ```no_run
	/// use stump_core::filesystem::ContentType;
	///
	/// let content_type = ContentType::PNG;
	/// assert!(content_type.is_image());
	///
	/// let content_type = ContentType::XHTML;
	/// assert!(!content_type.is_image());
	/// ```
	pub fn is_image(&self) -> bool {
		self.to_string().starts_with("image")
	}

	/// Returns true if the content type is in accordance with the OPDS 1.2 specification.
	/// This includes PNG, JPEG, and GIF images.
	///
	/// ## Example
	///
	/// ```no_run
	/// use stump_core::filesystem::ContentType;
	///
	/// let content_type = ContentType::PNG;
	/// assert!(content_type.is_opds_legacy_image());
	/// ```
	pub fn is_opds_legacy_image(&self) -> bool {
		matches!(
			self,
			ContentType::PNG | ContentType::JPEG | ContentType::GIF
		)
	}

	/// Returns true if the content type is a decodable image. A decodable image is an image that
	/// can be decoded by the `image` crate or by a custom image processor in Stump.
	///
	/// See https://github.com/image-rs/image?tab=readme-ov-file#supported-image-formats
	///
	/// ## Example
	///
	/// ```no_run
	/// use stump_core::filesystem::ContentType;
	///
	/// let content_type = ContentType::PNG;
	/// assert!(content_type.is_decodable_image());
	/// ```
	pub fn is_decodable_image(&self) -> bool {
		matches!(
			self,
			ContentType::PNG | ContentType::JPEG | ContentType::WEBP | ContentType::GIF
		)
	}

	/// Returns true if the content type is a ZIP archive.
	///
	/// ## Example
	///
	/// ```no_run
	/// use stump_core::filesystem::ContentType;
	///
	/// let content_type = ContentType::ZIP;
	/// assert!(content_type.is_zip());
	/// ```
	pub fn is_zip(&self) -> bool {
		self == &ContentType::ZIP || self == &ContentType::COMIC_ZIP
	}

	/// Returns true if the content type is a RAR archive.
	///
	/// ## Example
	///
	/// ```no_run
	/// use stump_core::filesystem::ContentType;
	///
	/// let content_type = ContentType::RAR;
	/// assert!(content_type.is_rar());
	/// ```
	pub fn is_rar(&self) -> bool {
		self == &ContentType::RAR || self == &ContentType::COMIC_RAR
	}

	/// Returns true if the content type is an EPUB archive.
	///
	/// ## Example
	///
	/// ```no_run
	/// use stump_core::filesystem::ContentType;
	///
	/// let content_type = ContentType::EPUB_ZIP;
	/// assert!(content_type.is_epub());
	/// ```
	pub fn is_epub(&self) -> bool {
		self == &ContentType::EPUB_ZIP
	}

	/// Returns the file extension of the content type. If the content type is unknown, then an
	/// empty string is returned.
	pub fn extension(&self) -> &str {
		match self {
			ContentType::XHTML => "xhtml",
			ContentType::XML => "xml",
			ContentType::HTML => "html",
			ContentType::PDF => "pdf",
			ContentType::EPUB_ZIP => "epub",
			ContentType::ZIP => "zip",
			ContentType::COMIC_ZIP => "cbz",
			ContentType::RAR => "rar",
			ContentType::COMIC_RAR => "cbr",
			ContentType::HEIF => "heif",
			ContentType::PNG => "png",
			ContentType::JPEG => "jpg",
			ContentType::JPEG_XL => "jxl",
			ContentType::WEBP => "webp",
			ContentType::AVIF => "avif",
			ContentType::GIF => "gif",
			ContentType::TXT => "txt",
			ContentType::UNKNOWN => "",
		}
	}
}

impl From<&str> for ContentType {
	/// Returns the content type from the string.
	///
	/// NOTE: It is assumed that the string is a valid representation of a content type.
	/// **Do not** use this method to parse a file path or extension.
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
			"image/heif" => ContentType::HEIF,
			"image/png" => ContentType::PNG,
			"image/jpeg" => ContentType::JPEG,
			"image/jxl" => ContentType::JPEG_XL,
			"image/webp" => ContentType::WEBP,
			"image/avif" => ContentType::AVIF,
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
			ContentType::AVIF => write!(f, "image/avif"),
			ContentType::HEIF => write!(f, "image/heif"),
			ContentType::PNG => write!(f, "image/png"),
			ContentType::JPEG => write!(f, "image/jpeg"),
			ContentType::JPEG_XL => write!(f, "image/jxl"),
			ContentType::WEBP => write!(f, "image/webp"),
			ContentType::GIF => write!(f, "image/gif"),
			ContentType::TXT => write!(f, "text/plain"),
			ContentType::UNKNOWN => write!(f, "unknown"),
		}
	}
}

// TODO(339): Support JpegXl and Avif

impl From<SupportedImageFormat> for ContentType {
	fn from(format: SupportedImageFormat) -> Self {
		match format {
			SupportedImageFormat::Jpeg => ContentType::JPEG,
			SupportedImageFormat::Png => ContentType::PNG,
			SupportedImageFormat::Webp => ContentType::WEBP,
		}
	}
}

impl TryFrom<ContentType> for image::ImageFormat {
	type Error = CoreError;

	fn try_from(value: ContentType) -> Result<Self, Self::Error> {
		/// Internal helper function to reduce code duplication
		fn unsupported_error(unsupported_type: &str) -> CoreError {
			CoreError::InternalError(format!(
				"Cannot convert {} into image::ImageFormat, not supported.",
				unsupported_type
			))
		}

		// Match values that are compatible with the image crate. Other values should return
		// an error.
		match value {
			ContentType::AVIF => Err(unsupported_error("ContentType::AVIF")),
			ContentType::HEIF => Err(unsupported_error("ContentType::HEIF")),
			ContentType::PNG => Ok(image::ImageFormat::Png),
			ContentType::JPEG => Ok(image::ImageFormat::Jpeg),
			ContentType::JPEG_XL => Err(unsupported_error("ContentType::JPEG_XL")),
			ContentType::WEBP => Ok(image::ImageFormat::WebP),
			ContentType::GIF => Ok(image::ImageFormat::Gif),
			ContentType::XHTML => Err(unsupported_error("ContentType::XHTML")),
			ContentType::XML => Err(unsupported_error("ContentType::XML")),
			ContentType::HTML => Err(unsupported_error("ContentType::HTML")),
			ContentType::PDF => Err(unsupported_error("ContentType::PDF")),
			ContentType::EPUB_ZIP => Err(unsupported_error("ContentType::EPUB_ZIP")),
			ContentType::ZIP => Err(unsupported_error("ContentType::ZIP")),
			ContentType::COMIC_ZIP => Err(unsupported_error("ContentType::COMIC_ZIP")),
			ContentType::RAR => Err(unsupported_error("ContentType::RAR")),
			ContentType::COMIC_RAR => Err(unsupported_error("ContentType::COMIC_RAR")),
			ContentType::TXT => Err(unsupported_error("ContentType::TXT")),
			ContentType::UNKNOWN => Err(unsupported_error("ContentType::UNKNOWN")),
		}
	}
}

#[cfg(test)]
mod tests {
	use super::*;

	#[test]
	fn test_content_type_from_extension() {
		assert_eq!(ContentType::from_extension("xhtml"), ContentType::XHTML);
		assert_eq!(ContentType::from_extension("xml"), ContentType::XML);
		assert_eq!(ContentType::from_extension("html"), ContentType::HTML);
		assert_eq!(ContentType::from_extension("pdf"), ContentType::PDF);
		assert_eq!(ContentType::from_extension("epub"), ContentType::EPUB_ZIP);
		assert_eq!(ContentType::from_extension("zip"), ContentType::ZIP);
		assert_eq!(ContentType::from_extension("cbz"), ContentType::COMIC_ZIP);
		assert_eq!(ContentType::from_extension("rar"), ContentType::RAR);
		assert_eq!(ContentType::from_extension("cbr"), ContentType::COMIC_RAR);
		assert_eq!(ContentType::from_extension("png"), ContentType::PNG);
		assert_eq!(ContentType::from_extension("jpg"), ContentType::JPEG);
		assert_eq!(ContentType::from_extension("jpeg"), ContentType::JPEG);
		assert_eq!(ContentType::from_extension("webp"), ContentType::WEBP);
		assert_eq!(ContentType::from_extension("avif"), ContentType::AVIF);
		assert_eq!(ContentType::from_extension("gif"), ContentType::GIF);
		assert_eq!(ContentType::from_extension("txt"), ContentType::TXT);
		assert_eq!(ContentType::from_extension("opf"), ContentType::XML);
		assert_eq!(ContentType::from_extension("ncx"), ContentType::XML);
		assert_eq!(ContentType::from_extension("unknown"), ContentType::UNKNOWN);
	}

	#[test]
	fn test_content_type_from_file() {
		assert_eq!(ContentType::from_file("test.xhtml"), ContentType::XHTML);
		assert_eq!(ContentType::from_file("test.xml"), ContentType::XML);
		assert_eq!(ContentType::from_file("test.html"), ContentType::HTML);
		assert_eq!(ContentType::from_file("test.pdf"), ContentType::PDF);
		assert_eq!(ContentType::from_file("test.epub"), ContentType::EPUB_ZIP);
		assert_eq!(ContentType::from_file("test.zip"), ContentType::ZIP);
		assert_eq!(ContentType::from_file("test.cbz"), ContentType::COMIC_ZIP);
		assert_eq!(ContentType::from_file("test.rar"), ContentType::RAR);
		assert_eq!(ContentType::from_file("test.cbr"), ContentType::COMIC_RAR);
		assert_eq!(ContentType::from_file("test.png"), ContentType::PNG);
		assert_eq!(ContentType::from_file("test.jpg"), ContentType::JPEG);
		assert_eq!(ContentType::from_file("test.jpeg"), ContentType::JPEG);
		assert_eq!(ContentType::from_file("test.webp"), ContentType::WEBP);
		assert_eq!(ContentType::from_file("test.avif"), ContentType::AVIF);
		assert_eq!(ContentType::from_file("test.gif"), ContentType::GIF);
		assert_eq!(ContentType::from_file("test.txt"), ContentType::TXT);
		assert_eq!(ContentType::from_file("test.unknown"), ContentType::UNKNOWN);
	}

	#[test]
	fn test_content_type_from_bytes() {
		let buf = [0xFF, 0xD8, 0xFF, 0xAA];
		assert_eq!(ContentType::from_bytes(&buf), ContentType::JPEG);
	}

	#[test]
	fn test_content_type_from_bytes_with_fallback() {
		let buf = [0xFF, 0xD8, 0xBB, 0xBB]; // Not a valid PNG buffer
		assert_eq!(
			ContentType::from_bytes_with_fallback(&buf, "png"),
			ContentType::PNG
		);
	}

	#[test]
	fn test_content_type_from_path() {
		let path = Path::new("test.xhtml");
		assert_eq!(ContentType::from_path(path), ContentType::XHTML);

		let path = Path::new("test.xml");
		assert_eq!(ContentType::from_path(path), ContentType::XML);

		let path = Path::new("test.html");
		assert_eq!(ContentType::from_path(path), ContentType::HTML);

		let path = Path::new("test.pdf");
		assert_eq!(ContentType::from_path(path), ContentType::PDF);

		let path = Path::new("test.epub");
		assert_eq!(ContentType::from_path(path), ContentType::EPUB_ZIP);

		let path = Path::new("test.zip");
		assert_eq!(ContentType::from_path(path), ContentType::ZIP);

		let path = Path::new("test.cbz");
		assert_eq!(ContentType::from_path(path), ContentType::COMIC_ZIP);

		let path = Path::new("test.rar");
		assert_eq!(ContentType::from_path(path), ContentType::RAR);

		let path = Path::new("test.cbr");
		assert_eq!(ContentType::from_path(path), ContentType::COMIC_RAR);

		let path = Path::new("test.png");
		assert_eq!(ContentType::from_path(path), ContentType::PNG);

		let path = Path::new("test.jpg");
		assert_eq!(ContentType::from_path(path), ContentType::JPEG);

		let path = Path::new("test.jpeg");
		assert_eq!(ContentType::from_path(path), ContentType::JPEG);

		let path = Path::new("test.webp");
		assert_eq!(ContentType::from_path(path), ContentType::WEBP);

		let path = Path::new("test.avif");
		assert_eq!(ContentType::from_path(path), ContentType::AVIF);

		let path = Path::new("test.gif");
		assert_eq!(ContentType::from_path(path), ContentType::GIF);

		let path = Path::new("test.txt");
		assert_eq!(ContentType::from_path(path), ContentType::TXT);

		let path = Path::new("test.unknown");
		assert_eq!(ContentType::from_path(path), ContentType::UNKNOWN);
	}

	#[test]
	fn test_content_type_mime_type() {
		assert_eq!(
			ContentType::XHTML.mime_type(),
			"application/xhtml+xml".to_string()
		);
		assert_eq!(ContentType::XML.mime_type(), "application/xml".to_string());
		assert_eq!(ContentType::HTML.mime_type(), "text/html".to_string());
		assert_eq!(ContentType::PDF.mime_type(), "application/pdf".to_string());
		assert_eq!(
			ContentType::EPUB_ZIP.mime_type(),
			"application/epub+zip".to_string()
		);
		assert_eq!(ContentType::ZIP.mime_type(), "application/zip".to_string());
		assert_eq!(
			ContentType::COMIC_ZIP.mime_type(),
			"application/vnd.comicbook+zip".to_string()
		);
		assert_eq!(
			ContentType::RAR.mime_type(),
			"application/vnd.rar".to_string()
		);
		assert_eq!(
			ContentType::COMIC_RAR.mime_type(),
			"application/vnd.comicbook-rar".to_string()
		);
		assert_eq!(ContentType::PNG.mime_type(), "image/png".to_string());
		assert_eq!(ContentType::JPEG.mime_type(), "image/jpeg".to_string());
		assert_eq!(ContentType::WEBP.mime_type(), "image/webp".to_string());
		assert_eq!(ContentType::AVIF.mime_type(), "image/avif".to_string());
		assert_eq!(ContentType::GIF.mime_type(), "image/gif".to_string());
		assert_eq!(ContentType::TXT.mime_type(), "text/plain".to_string());
		assert_eq!(ContentType::UNKNOWN.mime_type(), "unknown".to_string());
	}

	#[test]
	fn test_content_type_is_image() {
		// Images
		assert!(ContentType::AVIF.is_image());
		assert!(ContentType::HEIF.is_image());
		assert!(ContentType::PNG.is_image());
		assert!(ContentType::JPEG.is_image());
		assert!(ContentType::JPEG_XL.is_image());
		assert!(ContentType::WEBP.is_image());
		assert!(ContentType::AVIF.is_image());
		assert!(ContentType::GIF.is_image());
		assert!(!ContentType::XHTML.is_image());

		// Not images
		assert!(!ContentType::XHTML.is_image());
		assert!(!ContentType::XML.is_image());
		assert!(!ContentType::HTML.is_image());
		assert!(!ContentType::PDF.is_image());
		assert!(!ContentType::EPUB_ZIP.is_image());
		assert!(!ContentType::ZIP.is_image());
		assert!(!ContentType::COMIC_ZIP.is_image());
		assert!(!ContentType::RAR.is_image());
		assert!(!ContentType::COMIC_RAR.is_image());
		assert!(!ContentType::TXT.is_image());
		assert!(!ContentType::UNKNOWN.is_image());
	}

	#[test]
	fn test_content_type_is_opds_legacy_image() {
		// Is an OPDS 1.2 legacy image
		assert!(ContentType::PNG.is_opds_legacy_image());
		assert!(ContentType::JPEG.is_opds_legacy_image());
		assert!(ContentType::GIF.is_opds_legacy_image());

		// Not an OPDS 1.2 legacy image
		assert!(!ContentType::WEBP.is_opds_legacy_image());
		assert!(!ContentType::JPEG_XL.is_opds_legacy_image());
		assert!(!ContentType::AVIF.is_opds_legacy_image());
	}

	#[test]
	fn test_content_type_is_zip() {
		// ZIP archives
		assert!(ContentType::ZIP.is_zip());
		assert!(ContentType::COMIC_ZIP.is_zip());
		// Not ZIP archives
		assert!(!ContentType::RAR.is_zip());
		assert!(!ContentType::COMIC_RAR.is_zip());
	}

	#[test]
	fn test_content_type_is_rar() {
		// RAR archives
		assert!(ContentType::RAR.is_rar());
		assert!(ContentType::COMIC_RAR.is_rar());
		// Not RAR archives
		assert!(!ContentType::ZIP.is_rar());
		assert!(!ContentType::COMIC_ZIP.is_rar());
	}

	#[test]
	fn test_content_type_is_epub() {
		// EPUB archives
		assert!(ContentType::EPUB_ZIP.is_epub());
		// Not EPUB archives
		assert!(!ContentType::ZIP.is_epub());
		assert!(!ContentType::COMIC_ZIP.is_epub());
	}
}
