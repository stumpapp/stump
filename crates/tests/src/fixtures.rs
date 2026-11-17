use std::{
	fs::{self, File},
	io::Write,
	path::{Path, PathBuf},
};

pub fn workspace_root() -> PathBuf {
	PathBuf::from(env!("CARGO_MANIFEST_DIR"))
		.parent() // crates
		.and_then(|p| p.parent()) // workspace root
		.expect("Failed to locate workspace root")
		.to_path_buf()
}

pub fn test_data_dir() -> PathBuf {
	workspace_root().join("packages/fixtures")
}

pub fn get_test_zip_path() -> String {
	test_data_dir()
		.join("book.zip")
		.to_string_lossy()
		.to_string()
}

pub fn get_test_complex_zip_path() -> String {
	test_data_dir()
		.join("book-complex-tree.zip")
		.to_string_lossy()
		.to_string()
}

pub fn get_test_rar_path() -> String {
	test_data_dir()
		.join("book.rar")
		.to_string_lossy()
		.to_string()
}

pub fn get_test_rar_file_data() -> Vec<u8> {
	fs::read(get_test_rar_path()).expect("Failed to read test rar file")
}

pub fn get_test_complex_rar_path() -> String {
	test_data_dir()
		.join("book-complex-tree.rar")
		.to_string_lossy()
		.to_string()
}

pub fn get_test_epub_path() -> String {
	test_data_dir()
		.join("book.epub")
		.to_string_lossy()
		.to_string()
}

pub fn get_test_pdf_path() -> String {
	test_data_dir()
		.join("rust_book.pdf")
		.to_string_lossy()
		.to_string()
}

pub fn get_test_cbz_path() -> String {
	test_data_dir()
		.join("science_comics_001.cbz")
		.to_string_lossy()
		.to_string()
}

/// Writes a very minimal epub file with a single chapter. The `metadata` is
/// inserted as-is into the package document's `<metadata>`, e.g. to set a
/// `calibre:series` pass `<meta name="calibre:series" content="whateveryouwant"/>`
pub fn write_test_epub(path: impl AsRef<Path>, title: &str, metadata: &str) {
	let file = File::create(path).expect("create epub");
	let mut zip = zip::ZipWriter::new(file);
	let zip_options = zip::write::FileOptions::<()>::default();
	// The EPUB OCF spec requires the mimetype entry to be stored uncompressed
	let mimetype_options = zip::write::FileOptions::<()>::default()
		.compression_method(zip::CompressionMethod::Stored);

	zip.start_file("mimetype", mimetype_options)
		.expect("mimetype");
	zip.write_all(b"application/epub+zip")
		.expect("mimetype bytes");
	zip.start_file("META-INF/container.xml", zip_options)
		.expect("container");
	zip.write_all(
		br#"<?xml version="1.0"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
	<rootfiles>
		<rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
	</rootfiles>
</container>"#,
	)
	.expect("container bytes");
	zip.start_file("OEBPS/content.opf", zip_options)
		.expect("opf");
	write!(
		zip,
		r#"<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="uid">
	<metadata xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:opf="http://www.idpf.org/2007/opf">
		<dc:identifier id="uid">urn:uuid:stump-test</dc:identifier>
		<dc:title>{title}</dc:title>
		<dc:language>en</dc:language>
		<meta property="dcterms:modified">2026-01-01T00:00:00Z</meta>
		{metadata}
	</metadata>
	<manifest>
		<item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>
		<item id="ch1" href="ch1.xhtml" media-type="application/xhtml+xml"/>
	</manifest>
	<spine><itemref idref="ch1"/></spine>
</package>"#,
	)
	.expect("opf bytes");
	zip.start_file("OEBPS/nav.xhtml", zip_options).expect("nav");
	zip.write_all(
		br#"<?xml version="1.0" encoding="UTF-8"?>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops"><head><title>Contents</title></head><body><nav epub:type="toc"><ol><li><a href="ch1.xhtml">Chapter 1</a></li></ol></nav></body></html>"#,
	)
	.expect("nav bytes");
	zip.start_file("OEBPS/ch1.xhtml", zip_options)
		.expect("chapter");
	zip.write_all(
		br#"<?xml version="1.0" encoding="UTF-8"?>
<html xmlns="http://www.w3.org/1999/xhtml"><head><title>Chapter 1</title></head><body><p>Hello</p></body></html>"#,
	)
	.expect("chapter bytes");
	zip.finish().expect("finish zip");
}

/// Note: each page should be 96623 bytes. The macOS metadata files should be 220 bytes, but
/// ignored by the processor. Commenting the sizes for posterity.
pub fn get_nested_macos_compressed_cbz_path() -> String {
	test_data_dir()
		.join("nested-macos-compressed.cbz")
		.to_string_lossy()
		.to_string()
}
