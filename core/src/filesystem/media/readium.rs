use std::{fs::File, io::BufReader, path::PathBuf};

use epub::doc::{EpubDoc, NavPoint};
use models::shared::readium::{
	RWPMLink, RWPMLinkBuilder, RWPMMetadata, RWPMMetadataBuilder, RWPMPosition,
	RWPMPositionBuilder, RWPMPositionLocationsBuilder, RWPMPositions,
	RWPMPositionsBuilder, RWPManifest, RWPManifestBuilder,
};

use crate::filesystem::error::FileError;

/// A utility struct for generating Readium Web Publication Manifests
pub struct ReadiumManifestGenerator {
	epub_path: String,
	base_url: String,
}

impl ReadiumManifestGenerator {
	pub fn new(epub_path: impl Into<String>, base_url: impl Into<String>) -> Self {
		Self {
			epub_path: epub_path.into(),
			base_url: base_url.into(),
		}
	}

	pub fn generate_manifest(&self) -> Result<RWPManifest, FileError> {
		let mut epub = EpubDoc::new(&self.epub_path)
			.map_err(|e| FileError::EpubOpenError(e.to_string()))?;

		let metadata = self.extract_metadata(&epub)?;
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
			.map_err(|error| FileError::EpubReadError(error.to_string()))
	}

	/// Generate a positions list for the EPUB
	pub fn generate_positions(&self) -> Result<RWPMPositions, FileError> {
		let items = self.enumerate_spine_for_positions()?;
		let positions: Result<Vec<RWPMPosition>, FileError> = items
			.into_iter()
			.map(|item| {
				let locations = RWPMPositionLocationsBuilder::default()
					.position(item.position)
					.progression(0.0)
					.total_progression(item.total_progression)
					.build()
					.map_err(|error| FileError::EpubReadError(error.to_string()))?;

				let mut builder = RWPMPositionBuilder::default();
				builder
					.href(self.resource_url(&item.package_path))
					.media_type(item.media_type)
					.locations(locations);
				if let Some(title) = item.title {
					builder.title(title);
				}
				builder
					.build()
					.map_err(|error| FileError::EpubReadError(error.to_string()))
			})
			.collect();
		let positions = positions?;

		RWPMPositionsBuilder::default()
			.total(positions.len() as u32)
			.positions(positions)
			.build()
			.map_err(|error| FileError::EpubReadError(error.to_string()))
	}

	fn extract_metadata(
		&self,
		epub: &EpubDoc<BufReader<File>>,
	) -> Result<RWPMMetadata, FileError> {
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
			.reading_progression(
				get_first("direction").unwrap_or_else(|| "ltr".to_string()),
			);
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
			.map_err(|error| FileError::EpubReadError(error.to_string()))
	}

	fn generate_links(&self) -> Result<Vec<RWPMLink>, FileError> {
		[
			RWPMLinkBuilder::default()
				.href(format!("{}/manifest.json", self.base_url))
				.media_type("application/webpub+json")
				.rel(vec!["self".to_string()])
				.build()
				.map_err(|error| FileError::EpubReadError(error.to_string())),
			// Required by @readium/shared Publication.positionsFromManifest() —
			// media type is how the client discovers the list (not rel alone).
			RWPMLinkBuilder::default()
				.href(format!("{}/positions.json", self.base_url))
				.media_type("application/vnd.readium.position-list+json")
				.build()
				.map_err(|error| FileError::EpubReadError(error.to_string())),
		]
		.into_iter()
		.collect()
	}

	fn generate_reading_order(
		&self,
		epub: &mut EpubDoc<BufReader<File>>,
	) -> Result<Vec<RWPMLink>, FileError> {
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
						.map_err(|error| FileError::EpubReadError(error.to_string()))?,
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
	) -> Result<Vec<RWPMLink>, FileError> {
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
					.map_err(|error| FileError::EpubReadError(error.to_string()))
			})
			.collect()
	}

	fn generate_toc(
		&self,
		epub: &EpubDoc<BufReader<File>>,
	) -> Result<Vec<RWPMLink>, FileError> {
		epub.toc
			.iter()
			.map(|nav| self.nav_point_to_link(nav))
			.collect()
	}

	fn nav_point_to_link(&self, nav: &NavPoint) -> Result<RWPMLink, FileError> {
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
			.map_err(|error| FileError::EpubReadError(error.to_string()))
	}

	/// Build an absolute RWPM resource URL for a package-relative path.
	pub fn resource_url(&self, path: &str) -> String {
		rwpm_resource_url(&self.base_url, path)
	}

	/// Enumerate linear spine items with package paths, MIME types, and size weights
	/// used by both `positions.json` and whole-book search locators.
	pub fn enumerate_spine_for_positions(
		&self,
	) -> Result<Vec<SpinePositionMeta>, FileError> {
		let mut epub = EpubDoc::new(&self.epub_path)
			.map_err(|e| FileError::EpubOpenError(e.to_string()))?;
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
) -> Result<Vec<SpinePositionMeta>, FileError> {
	enumerate_spine_position_meta(epub)
}

fn enumerate_spine_position_meta(
	epub: &mut EpubDoc<BufReader<File>>,
) -> Result<Vec<SpinePositionMeta>, FileError> {
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
	use crate::filesystem::media::tests::get_test_epub_path;
	use models::shared::readium::RWPM_CONTEXT;

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
