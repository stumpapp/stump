use std::{fs::File, io::BufReader, path::PathBuf};

use epub::doc::{EpubDoc, NavPoint};
use models::shared::readium::{
	RWPMLink, RWPMLinkBuilder, RWPMMetadata, RWPMMetadataBuilder, RWPMPosition,
	RWPMPositionBuilder, RWPMPositionLocationsBuilder, RWPMPositions,
	RWPMPositionsBuilder, RWPManifest, RWPManifestBuilder,
};
use quick_xml::events::Event;
use quick_xml::Reader;

use super::error::ReadiumError;

/// A utility struct for generating Readium Web Publication Manifests
pub struct ReadiumManifestGenerator {
	epub_path: String,
	base_url: String,
}

struct SpineItemMetadata {
	package_path: String,
	media_type: String,
	title: Option<String>,
	position_count: usize,
}

/// The size of each "page" for positions generation
/// See the following:
/// - https://wiki.mobileread.com/wiki/Adobe_Digital_Editions#Page_numbers
/// - https://github.com/readium/architecture/issues/123
const PAGE_LENGTH: usize = 1024;

/// EPUB 3 defines page progression as "ltr", "rtl" or "default"; only the
/// first two specify a direction, so anything else normalizes to `None` and
/// callers fall back to their own defaults.
fn normalize_progression(value: &str) -> Option<String> {
	let value = value.trim().to_lowercase();
	matches!(value.as_str(), "ltr" | "rtl").then_some(value)
}

impl ReadiumManifestGenerator {
	pub fn new(epub_path: impl Into<String>, base_url: impl Into<String>) -> Self {
		Self {
			epub_path: epub_path.into(),
			base_url: base_url.into(),
		}
	}

	pub fn generate_manifest(&self) -> Result<RWPManifest, ReadiumError> {
		let mut epub = EpubDoc::new(&self.epub_path)
			.map_err(|e| ReadiumError::EpubOpen(e.to_string()))?;

		let metadata = self.extract_metadata(&mut epub)?;
		let links = self.generate_links()?;
		let reading_order = self.generate_reading_order(&mut epub)?;
		let resources = self.generate_resources(&epub)?;
		let toc = self.generate_toc(&epub)?;

		RWPManifestBuilder::default()
			.metadata(metadata)
			.links(links)
			.reading_order(reading_order)
			.resources(resources)
			.toc(toc)
			.build()
			.map_err(|error| ReadiumError::EpubRead(error.to_string()))
	}

	/// take the spine items and convert them into an itermediate representation
	/// to support generating positions
	fn generate_spine_metadata(
		&self,
		epub: &mut EpubDoc<BufReader<File>>,
	) -> Result<Vec<SpineItemMetadata>, ReadiumError> {
		let resource_metas = epub
			.spine
			.clone()
			.into_iter()
			.filter(|item| item.linear)
			.filter_map(|item| {
				let resource = epub.resources.get(&item.idref)?;
				let package_path = resource.path.to_string_lossy().to_string();
				let media_type = resource.mime.clone();

				let title = epub
					.toc
					.iter()
					.find(|nav| {
						let content = nav.content.to_string_lossy();
						content.contains(package_path.as_str())
							|| content.contains(&item.idref)
					})
					.map(|nav| nav.label.clone());

				let compressed_size = epub
					.get_resource_compressed_size(&item.idref)
					.unwrap_or(PAGE_LENGTH as u64) as usize;
				let position_count =
					(compressed_size as f64 / PAGE_LENGTH as f64).ceil() as usize;
				let position_count = position_count.max(1);

				Some(SpineItemMetadata {
					package_path,
					media_type,
					title,
					position_count,
				})
			})
			.collect();

		Ok(resource_metas)
	}

	/// Generate a positions list for the EPUB
	pub fn generate_positions(&self) -> Result<RWPMPositions, ReadiumError> {
		let mut epub = EpubDoc::new(&self.epub_path)
			.map_err(|e| ReadiumError::EpubOpen(e.to_string()))?;

		let spine_items = self.generate_spine_metadata(&mut epub)?;
		let total_positions: usize = spine_items.iter().map(|r| r.position_count).sum();
		if total_positions == 0 {
			return Ok(RWPMPositions::default());
		}

		let mut positions: Vec<RWPMPosition> = Vec::with_capacity(total_positions);
		let mut book_position: usize = 1; // 1-based, book-wide

		for meta in spine_items {
			let href = self.resource_url(&meta.package_path);
			for i in 0..meta.position_count {
				let progression = i as f64 / meta.position_count as f64;
				let total_progression =
					(book_position - 1) as f64 / total_positions as f64;

				let locations = RWPMPositionLocationsBuilder::default()
					.position(book_position as u32)
					.progression(progression)
					.total_progression(total_progression)
					.build()
					.map_err(|e| ReadiumError::Builder(e.to_string()))?;

				let mut builder = RWPMPositionBuilder::default();
				builder
					.href(href.clone())
					.media_type(meta.media_type.clone())
					.locations(locations);
				if i == 0 {
					if let Some(ref title) = meta.title {
						builder.title(title.clone());
					}
				}
				positions.push(
					builder
						.build()
						.map_err(|e| ReadiumError::Builder(e.to_string()))?,
				);

				book_position += 1;
			}
		}

		RWPMPositionsBuilder::default()
			.total(positions.len() as u32)
			.positions(positions)
			.build()
			.map_err(|e| ReadiumError::Builder(e.to_string()))
	}

	fn extract_metadata(
		&self,
		epub: &mut EpubDoc<BufReader<File>>,
	) -> Result<RWPMMetadata, ReadiumError> {
		// Readium's web reader only enables its CJK vertical layout pipeline when the
		// manifest reports "rtl" alongside a CJK primary language. The progression
		// lives on <spine page-progression-direction>, which epub-rs does not surface.
		// Fall back to a legacy <meta name="direction"> entry when the spine does
		// not declare one.
		let reading_progression = self
			.spine_reading_progression(epub)
			.or_else(|| {
				epub.metadata
					.iter()
					.find(|m| m.property == "direction")
					.and_then(|m| normalize_progression(&m.value))
			})
			.unwrap_or_else(|| "ltr".to_string());

		let get_first = |key: &str| -> Option<String> {
			epub.metadata
				.iter()
				.find(|m| m.property == key)
				.map(|m| m.value.clone())
		};

		let get_all = |key: &str| -> Vec<String> {
			epub.metadata
				.iter()
				.filter(|m| m.property == key)
				.map(|m| m.value.clone())
				.collect()
		};

		let title = get_first("title").unwrap_or_else(|| {
			PathBuf::from(&self.epub_path)
				.file_stem()
				.map(|s| s.to_string_lossy().to_string())
				.unwrap_or_else(|| "Untitled".to_string())
		});

		let mut builder = RWPMMetadataBuilder::default();
		builder
			.title(title)
			.author(get_all("creator"))
			.number_of_pages(epub.get_num_chapters() as u32)
			.reading_progression(reading_progression);
		if let Some(identifier) = get_first("identifier") {
			builder.identifier(identifier);
		}
		if let Some(publisher) = get_first("publisher") {
			builder.publisher(publisher);
		}
		if let Some(language) = get_first("language") {
			builder.language(language);
		}
		if let Some(published) = get_first("date") {
			builder.published(published);
		}
		if let Some(description) = get_first("description") {
			builder.description(description);
		}
		builder
			.build()
			.map_err(|error| ReadiumError::EpubRead(error.to_string()))
	}

	/// Read `page-progression-direction` from the OPF `<spine>` element. EPUB 3
	/// defines it as "ltr", "rtl" or "default", where only the first two carry
	/// meaning ("default" leaves progression unspecified). epub-rs parses only
	/// the spine's `toc` attribute, so the OPF is read directly from the
	/// archive. Match on local name so prefixed variants like `<opf:spine>`
	/// are handled the same.
	fn spine_reading_progression(
		&self,
		epub: &mut EpubDoc<BufReader<File>>,
	) -> Option<String> {
		let root_file = epub.root_file.clone();
		let opf = epub.get_resource_str_by_path(root_file)?;
		let mut reader = Reader::from_str(&opf);
		reader.config_mut().trim_text(true);
		let mut buf = Vec::new();
		loop {
			match reader.read_event_into(&mut buf) {
				Ok(Event::Start(ref e)) | Ok(Event::Empty(ref e)) => {
					if e.local_name().as_ref() == b"spine" {
						return e
							.attributes()
							.flatten()
							.find(|attr| {
								attr.key.as_ref() == b"page-progression-direction"
							})
							.and_then(|attr| attr.unescape_value().ok())
							.and_then(|value| normalize_progression(&value));
					}
				},
				Ok(Event::Eof) => return None,
				Err(_) => return None,
				_ => {},
			}
			buf.clear();
		}
	}

	fn generate_links(&self) -> Result<Vec<RWPMLink>, ReadiumError> {
		[
			RWPMLinkBuilder::default()
				.href(format!("{}/manifest.json", self.base_url))
				.media_type("application/webpub+json")
				.rel(vec!["self".to_string()])
				.build()
				.map_err(|error| ReadiumError::EpubRead(error.to_string())),
			// Required by @readium/shared Publication.positionsFromManifest() —
			// media type is how the client discovers the list (not rel alone).
			RWPMLinkBuilder::default()
				.href(format!("{}/positions.json", self.base_url))
				.media_type("application/vnd.readium.position-list+json")
				.build()
				.map_err(|error| ReadiumError::EpubRead(error.to_string())),
		]
		.into_iter()
		.collect()
	}

	fn generate_reading_order(
		&self,
		epub: &mut EpubDoc<BufReader<File>>,
	) -> Result<Vec<RWPMLink>, ReadiumError> {
		let mut reading_order = Vec::new();

		for (i, spine_item) in epub.spine.clone().iter().enumerate() {
			let resource = epub.resources.get(&spine_item.idref);

			if let Some(resource) = resource {
				let href = resource.path.to_string_lossy().to_string();
				let media_type = Some(resource.mime.clone());

				let title = epub
					.toc
					.iter()
					.find(|nav| nav.content.to_string_lossy().contains(&href))
					.map(|nav| nav.label.clone());

				let mut builder = RWPMLinkBuilder::default();
				builder.href(self.resource_url(&href));
				if let Some(media_type) = media_type {
					builder.media_type(media_type);
				}
				if let Some(title) = title {
					builder.title(title);
				}

				reading_order.push(
					builder
						.build()
						.map_err(|error| ReadiumError::EpubRead(error.to_string()))?,
				);
			} else {
				tracing::warn!(
					spine_idref = %spine_item.idref,
					index = i,
					"Spine item not found in resources"
				);
			}
		}

		Ok(reading_order)
	}

	fn generate_resources(
		&self,
		epub: &EpubDoc<BufReader<File>>,
	) -> Result<Vec<RWPMLink>, ReadiumError> {
		let spine_idrefs: std::collections::HashSet<_> =
			epub.spine.iter().map(|item| item.idref.as_str()).collect();

		epub.resources
			.iter()
			.filter(|(id, _)| !spine_idrefs.contains(id.as_str()))
			.map(|(_, resource)| {
				let href = resource.path.to_string_lossy().to_string();
				RWPMLinkBuilder::default()
					.href(self.resource_url(&href))
					.media_type(resource.mime.clone())
					.build()
					.map_err(|error| ReadiumError::EpubRead(error.to_string()))
			})
			.collect()
	}

	fn generate_toc(
		&self,
		epub: &EpubDoc<BufReader<File>>,
	) -> Result<Vec<RWPMLink>, ReadiumError> {
		epub.toc
			.iter()
			.map(|nav| self.nav_point_to_link(nav))
			.collect()
	}

	fn nav_point_to_link(&self, nav: &NavPoint) -> Result<RWPMLink, ReadiumError> {
		let href = nav.content.to_string_lossy().to_string();
		let children = nav
			.children
			.iter()
			.map(|child| self.nav_point_to_link(child))
			.collect::<Result<Vec<_>, _>>()?;
		RWPMLinkBuilder::default()
			.href(self.resource_url(&href))
			.media_type("application/xhtml+xml")
			.title(&nav.label)
			.children(children)
			.build()
			.map_err(|error| ReadiumError::EpubRead(error.to_string()))
	}

	/// Build an absolute RWPM resource URL for a package-relative path.
	pub fn resource_url(&self, path: &str) -> String {
		rwpm_resource_url(&self.base_url, path)
	}

	/// Enumerate linear spine items with package paths, MIME types, and size weights
	/// used by both `positions.json` and whole-book search locators.
	pub fn enumerate_spine_for_positions(
		&self,
	) -> Result<Vec<SpinePositionMeta>, ReadiumError> {
		let mut epub = EpubDoc::new(&self.epub_path)
			.map_err(|e| ReadiumError::EpubOpen(e.to_string()))?;
		enumerate_spine_for_positions_at(&mut epub)
	}
}

/// Absolute `/resource/{path}` href for a package-relative EPUB path.
pub fn rwpm_resource_url(base_url: &str, path: &str) -> String {
	let normalized = path.trim_start_matches('/');
	let (path_part, fragment) = match normalized.split_once('#') {
		Some((path, frag)) => (path, Some(frag)),
		None => (normalized, None),
	};

	let encoded = path_part
		.split('/')
		.map(|segment| urlencoding::encode(segment).into_owned())
		.collect::<Vec<_>>()
		.join("/");

	let mut url = format!("{}/resource/{}", base_url.trim_end_matches('/'), encoded);
	if let Some(frag) = fragment {
		url.push('#');
		url.push_str(frag);
	}
	url
}

/// Spine item metadata used to align search locators with `positions.json`.
#[derive(Debug, Clone)]
pub struct SpinePositionMeta {
	pub spine_index: usize,
	pub package_path: String,
	pub media_type: String,
	pub title: Option<String>,
	pub size: usize,
	pub position: u32,
	pub total_progression: f64,
}

/// Enumerate spine metadata from an already-open `EpubDoc`.
pub fn enumerate_spine_for_positions_at(
	epub: &mut EpubDoc<BufReader<File>>,
) -> Result<Vec<SpinePositionMeta>, ReadiumError> {
	enumerate_spine_position_meta(epub)
}

fn enumerate_spine_position_meta(
	epub: &mut EpubDoc<BufReader<File>>,
) -> Result<Vec<SpinePositionMeta>, ReadiumError> {
	let num_pages = epub.get_num_chapters();

	struct RawItem {
		spine_index: usize,
		package_path: String,
		media_type: String,
		title: Option<String>,
		size: usize,
	}

	let items: Vec<RawItem> = (0..num_pages)
		.filter_map(|i| {
			epub.set_current_chapter(i);

			let spine_item = epub.spine.get(i)?;
			let resource = epub.resources.get(&spine_item.idref).or_else(|| {
				tracing::warn!(
					page = i,
					spine_idref = %spine_item.idref,
					"Spine item not found in resources! Skipping for positions."
				);
				None
			})?;

			let package_path = resource.path.to_string_lossy().to_string();
			let media_type = epub
				.get_current_mime()
				.unwrap_or_else(|| "application/xhtml+xml".to_string());

			let title = epub
				.toc
				.iter()
				.find(|nav| {
					nav.content
						.to_string_lossy()
						.contains(package_path.as_str())
						|| nav.content.to_string_lossy().contains(&spine_item.idref)
				})
				.map(|nav| nav.label.clone());

			let size = match epub.get_current() {
				Some((content, _)) => content.len(),
				None => {
					tracing::warn!(
						page = i,
						"Failed to read content for page, defaulting size"
					);
					1000
				},
			};

			Some(RawItem {
				spine_index: i,
				package_path,
				media_type,
				title,
				size,
			})
		})
		.collect();

	let total_size: usize = items.iter().map(|p| p.size).sum::<usize>().max(1);
	let mut cumulative_size: usize = 0;

	Ok(items
		.into_iter()
		.enumerate()
		.map(|(ordinal, item)| {
			let total_progression = cumulative_size as f64 / total_size as f64;
			cumulative_size += item.size;
			SpinePositionMeta {
				spine_index: item.spine_index,
				package_path: item.package_path,
				media_type: item.media_type,
				title: item.title,
				size: item.size,
				position: (ordinal + 1) as u32,
				total_progression,
			}
		})
		.collect())
}

#[cfg(test)]
mod tests {
	use super::*;
	use ::tests::fixtures::get_test_epub_path;
	use models::shared::readium::RWPM_CONTEXT;
	use std::io::Write;

	#[derive(Default)]
	struct TestEpubOptions<'a> {
		/// Value of `<spine page-progression-direction="...">`, if any.
		progression: Option<&'a str>,
		/// Emit the spine as a prefixed `<opf:spine>` element.
		prefixed_spine: bool,
		/// Emit a legacy `<meta name="direction" content="...">` entry.
		legacy_direction_meta: Option<&'a str>,
		/// Additional `(path, contents)` pairs to write under `OEBPS/`,
		/// unreferenced by the OPF manifest. Used to exercise
		/// `spine_reading_progression` against resources other than the
		/// package document itself.
		extra_resources: Vec<(&'a str, &'a [u8])>,
	}

	/// Build a minimal EPUB 3 with a single chapter and the given
	/// `page-progression-direction` on its spine.
	fn write_test_epub(path: &std::path::Path, options: TestEpubOptions<'_>) {
		let file = File::create(path).expect("create epub");
		let mut zip = zip::ZipWriter::new(file);
		let zip_options = zip::write::FileOptions::<()>::default();

		zip.start_file("mimetype", zip_options).expect("mimetype");
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

		let spine = match options.progression {
			Some(dir) if options.prefixed_spine => format!(
				r#"<opf:spine xmlns:opf="http://www.idpf.org/2007/opf" page-progression-direction="{dir}"><itemref idref="ch1"/></opf:spine>"#
			),
			Some(dir) => format!(
				r#"<spine page-progression-direction="{dir}"><itemref idref="ch1"/></spine>"#
			),
			None => r#"<spine><itemref idref="ch1"/></spine>"#.to_string(),
		};
		let legacy_direction_meta = options
			.legacy_direction_meta
			.map(|dir| format!(r#"<meta name="direction" content="{dir}"/>"#))
			.unwrap_or_default();
		let opf = format!(
			r#"<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="uid">
	<metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
		<dc:identifier id="uid">urn:uuid:stump-spine-test</dc:identifier>
		<dc:title>Spine Test</dc:title>
		<dc:language>zh-TW</dc:language>
		{legacy_direction_meta}
	</metadata>
	<manifest>
		<item id="ch1" href="ch1.xhtml" media-type="application/xhtml+xml"/>
	</manifest>
	{spine}
</package>"#
		);
		zip.start_file("OEBPS/content.opf", zip_options)
			.expect("opf");
		zip.write_all(opf.as_bytes()).expect("opf bytes");

		zip.start_file("OEBPS/ch1.xhtml", zip_options)
			.expect("chapter");
		zip.write_all(
			br#"<?xml version="1.0" encoding="UTF-8"?>
<html xmlns="http://www.w3.org/1999/xhtml"><head><title>Chapter 1</title></head><body><p>Hello</p></body></html>"#,
		)
		.expect("chapter bytes");

		for (name, contents) in &options.extra_resources {
			zip.start_file(format!("OEBPS/{name}"), zip_options)
				.expect("extra resource");
			zip.write_all(contents).expect("extra resource bytes");
		}

		zip.finish().expect("finish zip");
	}

	/// Build a minimal EPUB via [`write_test_epub`] and open it as an
	/// [`EpubDoc`], keeping the backing temp directory alive alongside it.
	fn build_test_epub_doc(
		options: TestEpubOptions<'_>,
	) -> (tempfile::TempDir, EpubDoc<BufReader<File>>) {
		let temp = tempfile::tempdir().expect("tempdir");
		let path = temp.path().join("book.epub");
		write_test_epub(&path, options);
		let epub = EpubDoc::new(&path).expect("open epub");
		(temp, epub)
	}

	fn assert_progression(options: TestEpubOptions<'_>, expected: &str) {
		let temp = tempfile::tempdir().expect("tempdir");
		let path = temp.path().join("book.epub");
		write_test_epub(&path, options);

		let generator = ReadiumManifestGenerator::new(
			path.to_string_lossy().to_string(),
			"https://example.com/api/v2/epub/book-1",
		);
		let manifest = generator.generate_manifest().expect("manifest");

		assert_eq!(
			manifest.metadata.reading_progression.as_deref(),
			Some(expected)
		);
	}

	#[test]
	fn test_reading_progression_from_spine_rtl() {
		assert_progression(
			TestEpubOptions {
				progression: Some("rtl"),
				..TestEpubOptions::default()
			},
			"rtl",
		);
	}

	#[test]
	fn test_reading_progression_from_prefixed_spine_rtl() {
		assert_progression(
			TestEpubOptions {
				progression: Some("rtl"),
				prefixed_spine: true,
				..TestEpubOptions::default()
			},
			"rtl",
		);
	}

	#[test]
	fn test_reading_progression_defaults_to_ltr_without_spine_attribute() {
		assert_progression(
			TestEpubOptions {
				progression: None,
				..TestEpubOptions::default()
			},
			"ltr",
		);
	}

	#[test]
	fn test_reading_progression_spine_default_falls_back_to_ltr() {
		assert_progression(
			TestEpubOptions {
				progression: Some("default"),
				..TestEpubOptions::default()
			},
			"ltr",
		);
	}

	#[test]
	fn test_reading_progression_spine_default_uses_legacy_direction_meta() {
		assert_progression(
			TestEpubOptions {
				progression: Some("default"),
				legacy_direction_meta: Some("rtl"),
				..TestEpubOptions::default()
			},
			"rtl",
		);
	}

	#[test]
	fn test_reading_progression_falls_back_to_legacy_direction_meta() {
		assert_progression(
			TestEpubOptions {
				progression: None,
				legacy_direction_meta: Some("rtl"),
				..TestEpubOptions::default()
			},
			"rtl",
		);
	}

	#[test]
	fn test_reading_progression_spine_wins_over_legacy_direction_meta() {
		assert_progression(
			TestEpubOptions {
				progression: Some("ltr"),
				legacy_direction_meta: Some("rtl"),
				..TestEpubOptions::default()
			},
			"ltr",
		);
	}

	#[test]
	fn test_existing_fixture_reading_progression_is_ltr() {
		let generator = ReadiumManifestGenerator::new(
			get_test_epub_path(),
			"https://example.com/api/v2/epub/book-1",
		);
		let manifest = generator.generate_manifest().expect("manifest");

		assert_eq!(
			manifest.metadata.reading_progression.as_deref(),
			Some("ltr"),
			"fixture spine has no page-progression-direction, manifest should stay ltr"
		);
	}

	#[test]
	fn test_spine_reading_progression_returns_none_when_scanned_document_has_no_spine() {
		let (_temp, mut epub) = build_test_epub_doc(TestEpubOptions {
			progression: Some("rtl"),
			..TestEpubOptions::default()
		});
		// Point the scan at a well-formed document with no <spine> element so
		// the reader runs to Event::Eof without ever matching.
		epub.root_file = PathBuf::from("OEBPS/ch1.xhtml");

		let generator = ReadiumManifestGenerator::new(
			"unused",
			"https://example.com/api/v2/epub/book-1",
		);
		assert_eq!(generator.spine_reading_progression(&mut epub), None);
	}

	#[test]
	fn test_spine_reading_progression_returns_none_on_malformed_xml() {
		let (_temp, mut epub) = build_test_epub_doc(TestEpubOptions {
			progression: Some("rtl"),
			extra_resources: vec![("malformed.xhtml", b"<root><a></root>" as &[u8])],
			..TestEpubOptions::default()
		});
		// A mismatched end tag makes quick_xml return an error mid-scan.
		epub.root_file = PathBuf::from("OEBPS/malformed.xhtml");

		let generator = ReadiumManifestGenerator::new(
			"unused",
			"https://example.com/api/v2/epub/book-1",
		);
		assert_eq!(generator.spine_reading_progression(&mut epub), None);
	}

	#[test]
	fn test_rwpm_link_builder() {
		let link = RWPMLinkBuilder::default()
			.href("/test.html")
			.media_type("text/html")
			.title("Test")
			.rel(vec!["self".to_string()])
			.build()
			.unwrap();

		assert_eq!(link.href, "/test.html");
		assert_eq!(link.media_type, Some("text/html".to_string()));
		assert_eq!(link.title, Some("Test".to_string()));
		assert_eq!(link.rel, Some(vec!["self".to_string()]));
		assert!(link.children.is_empty());
	}

	#[test]
	fn test_rwpm_link_children_builder() {
		let child = RWPMLinkBuilder::default()
			.href("/child.xhtml")
			.media_type("application/xhtml+xml")
			.title("Child")
			.build()
			.unwrap();
		let parent = RWPMLinkBuilder::default()
			.href("/parent.xhtml")
			.media_type("application/xhtml+xml")
			.title("Parent")
			.children(vec![child])
			.build()
			.unwrap();

		assert_eq!(parent.children.len(), 1);
		assert_eq!(parent.children[0].title, Some("Child".to_string()));
	}

	#[test]
	fn test_manifest_serialization() {
		let metadata = RWPMMetadataBuilder::default()
			.title("Test Book")
			.author(vec!["Author".to_string()])
			.build()
			.unwrap();
		let manifest = RWPManifestBuilder::default()
			.metadata(metadata)
			.links(vec![RWPMLinkBuilder::default()
				.href("/manifest.json")
				.media_type("application/webpub+json")
				.rel(vec!["self".to_string()])
				.build()
				.unwrap()])
			.reading_order(vec![RWPMLinkBuilder::default()
				.href("/chapter1.xhtml")
				.media_type("application/xhtml+xml")
				.title("Chapter 1")
				.build()
				.unwrap()])
			.build()
			.unwrap();

		let json = serde_json::to_string(&manifest).unwrap();
		assert!(json.contains("Test Book"));
		assert!(json.contains("@context"));
		assert!(json.contains("readingOrder"));
	}

	#[test]
	fn test_manifest_serialization_nested_toc() {
		let child = RWPMLinkBuilder::default()
			.href("/OEBPS/ch1.xhtml")
			.media_type("application/xhtml+xml")
			.title("Chapter 1")
			.build()
			.unwrap();
		let parent = RWPMLinkBuilder::default()
			.href("/OEBPS/volume1.xhtml")
			.media_type("application/xhtml+xml")
			.title("Volume 1")
			.children(vec![child])
			.build()
			.unwrap();
		let manifest = RWPManifestBuilder::default()
			.metadata(
				RWPMMetadataBuilder::default()
					.title("Test Book")
					.build()
					.unwrap(),
			)
			.toc(vec![parent])
			.build()
			.unwrap();

		let json = serde_json::to_string(&manifest).unwrap();
		assert!(json.contains("Volume 1"));
		assert!(json.contains("Chapter 1"));
		assert!(
			json.contains("\"children\":["),
			"toc children should be serialized"
		);
	}

	#[test]
	fn test_resource_url_percent_encodes_segments() {
		let generator = ReadiumManifestGenerator::new(
			"/tmp/book.epub",
			"https://example.com/api/v2/epub/abc",
		);

		assert_eq!(
			generator.resource_url("OEBPS/My Chapter.xhtml"),
			"https://example.com/api/v2/epub/abc/resource/OEBPS/My%20Chapter.xhtml"
		);
		assert_eq!(
			generator.resource_url("/OEBPS/ch1.xhtml#frag"),
			"https://example.com/api/v2/epub/abc/resource/OEBPS/ch1.xhtml#frag"
		);
	}

	#[test]
	fn test_generate_manifest_from_fixture() {
		let path = get_test_epub_path();
		let base = "https://example.com/api/v2/epub/book-1";
		let generator = ReadiumManifestGenerator::new(&path, base);
		let manifest = generator.generate_manifest().expect("manifest");

		assert_eq!(manifest.context, RWPM_CONTEXT);
		assert!(!manifest.reading_order.is_empty());
		assert!(
			manifest.links.iter().any(|link| {
				link.rel
					.as_ref()
					.is_some_and(|rels| rels.iter().any(|r| r == "self"))
					&& link.href.ends_with("/manifest.json")
			}),
			"expected self link to manifest.json"
		);
		assert!(
			manifest.links.iter().any(|link| {
				link.media_type.as_deref()
					== Some("application/vnd.readium.position-list+json")
					&& link.href.ends_with("/positions.json")
			}),
			"expected positions list link for Readium Web"
		);

		let first = &manifest.reading_order[0];
		assert!(
			first.href.contains("/resource/"),
			"readingOrder href should point at resource route: {}",
			first.href
		);
		assert!(first.href.starts_with(base));

		assert!(
			manifest
				.resources
				.iter()
				.any(|r| r.href.contains("/resource/")),
			"expected non-spine resources with resource hrefs"
		);
	}

	#[test]
	fn test_generate_positions_from_fixture() {
		let path = get_test_epub_path();
		let base = "https://example.com/api/v2/epub/book-1";
		let generator = ReadiumManifestGenerator::new(&path, base);
		let positions = generator.generate_positions().expect("positions");

		assert!(positions.total >= 1);
		assert_eq!(positions.total as usize, positions.positions.len());
		assert!(positions.positions[0].href.contains("/resource/"));
		assert_eq!(positions.positions[0].locations.position, 1);
	}
}
