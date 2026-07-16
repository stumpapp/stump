use std::{collections::HashMap, fs::File, io::BufReader, path::PathBuf};

use epub::doc::{EpubDoc, NavPoint};
use serde::{Deserialize, Serialize};
use serde_with::skip_serializing_none;

use crate::filesystem::error::FileError;

pub const RWPM_CONTEXT: &str = "https://readium.org/webpub-manifest/context.jsonld";

/// A link in a Readium Web Publication Manifest
#[skip_serializing_none]
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct RWPMLink {
	pub href: String,
	#[serde(rename = "type")]
	pub media_type: Option<String>,
	pub title: Option<String>,
	pub rel: Option<Vec<String>>,
	#[serde(skip_serializing_if = "HashMap::is_empty", default)]
	pub properties: HashMap<String, serde_json::Value>,
	#[serde(skip_serializing_if = "Vec::is_empty", default)]
	pub children: Vec<RWPMLink>,
	pub duration: Option<f64>, //  for audio/video
	pub width: Option<u32>,    // for images
	pub height: Option<u32>,   // for images
}

impl RWPMLink {
	pub fn new(href: impl Into<String>, media_type: Option<String>) -> Self {
		Self {
			href: href.into(),
			media_type,
			..Default::default()
		}
	}

	pub fn with_title(mut self, title: impl Into<String>) -> Self {
		self.title = Some(title.into());
		self
	}

	pub fn with_rel(mut self, rel: impl Into<String>) -> Self {
		self.rel = Some(vec![rel.into()]);
		self
	}

	pub fn with_children(mut self, children: Vec<RWPMLink>) -> Self {
		self.children = children;
		self
	}
}

/// Metadata for a Readium Web Publication
#[skip_serializing_none]
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct RWPMMetadata {
	pub title: String,
	pub identifier: Option<String>, // e.g., ISBN, UUID
	#[serde(skip_serializing_if = "Vec::is_empty", default)]
	pub author: Vec<String>,
	pub publisher: Option<String>,
	pub language: Option<String>, // Supposedly a BCP 47
	pub published: Option<String>,
	pub modified: Option<String>,
	pub description: Option<String>,
	pub number_of_pages: Option<u32>,
	pub reading_progression: Option<String>,
}

/// A Readium Web Publication Manifest
#[skip_serializing_none]
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RWPManifest {
	#[serde(rename = "@context")]
	pub context: String,
	pub metadata: RWPMMetadata,
	pub links: Vec<RWPMLink>,
	pub reading_order: Vec<RWPMLink>,
	#[serde(skip_serializing_if = "Vec::is_empty", default)]
	pub resources: Vec<RWPMLink>,
	#[serde(skip_serializing_if = "Vec::is_empty", default)]
	pub toc: Vec<RWPMLink>,
}

impl Default for RWPManifest {
	fn default() -> Self {
		Self {
			context: RWPM_CONTEXT.to_string(),
			metadata: RWPMMetadata::default(),
			links: Vec::new(),
			reading_order: Vec::new(),
			resources: Vec::new(),
			toc: Vec::new(),
		}
	}
}

/// A position locator for Readium navigation
///
/// See: https://readium.org/architecture/models/locators/positions/
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RWPMPosition {
	pub href: String,
	#[serde(rename = "type")]
	pub media_type: String,
	pub title: Option<String>,
	pub locations: RWPMPositionLocations,
}

/// Location information within a position
///
/// See: https://readium.org/architecture/models/locators/#the-locator-object
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RWPMPositionLocations {
	pub position: u32,          // 1-based
	pub progression: f64,       // 0.0-1.0
	pub total_progression: f64, // 0.0-1.0
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RWPMPositions {
	pub total: u32,
	pub positions: Vec<RWPMPosition>,
}

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

		let metadata = self.extract_metadata(&epub);
		let links = self.generate_links();
		let reading_order = self.generate_reading_order(&mut epub)?;
		let resources = self.generate_resources(&epub);
		let toc = self.generate_toc(&epub);

		Ok(RWPManifest {
			context: RWPM_CONTEXT.to_string(),
			metadata,
			links,
			reading_order,
			resources,
			toc,
		})
	}

	/// Generate a positions list for the EPUB
	pub fn generate_positions(&self) -> Result<RWPMPositions, FileError> {
		let items = self.enumerate_spine_for_positions()?;
		let positions: Vec<RWPMPosition> = items
			.into_iter()
			.map(|item| RWPMPosition {
				href: self.resource_url(&item.package_path),
				media_type: item.media_type,
				title: item.title,
				locations: RWPMPositionLocations {
					position: item.position,
					progression: 0.0,
					total_progression: item.total_progression,
				},
			})
			.collect();

		Ok(RWPMPositions {
			total: positions.len() as u32,
			positions,
		})
	}

	fn extract_metadata(&self, epub: &EpubDoc<BufReader<File>>) -> RWPMMetadata {
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

		RWPMMetadata {
			title,
			identifier: get_first("identifier"),
			author: get_all("creator"),
			publisher: get_first("publisher"),
			language: get_first("language"),
			published: get_first("date"),
			modified: None,
			description: get_first("description"),
			number_of_pages: Some(epub.get_num_chapters() as u32),
			reading_progression: Some(
				get_first("direction").unwrap_or_else(|| "ltr".to_string()),
			),
		}
	}

	fn generate_links(&self) -> Vec<RWPMLink> {
		vec![
			RWPMLink::new(
				format!("{}/manifest.json", self.base_url),
				Some("application/webpub+json".to_string()),
			)
			.with_rel("self"),
			// Required by @readium/shared Publication.positionsFromManifest() —
			// media type is how the client discovers the list (not rel alone).
			RWPMLink::new(
				format!("{}/positions.json", self.base_url),
				Some("application/vnd.readium.position-list+json".to_string()),
			),
		]
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

				let mut link = RWPMLink::new(self.resource_url(&href), media_type);
				if let Some(t) = title {
					link = link.with_title(t);
				}

				reading_order.push(link);
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

	fn generate_resources(&self, epub: &EpubDoc<BufReader<File>>) -> Vec<RWPMLink> {
		let spine_idrefs: std::collections::HashSet<_> =
			epub.spine.iter().map(|item| item.idref.as_str()).collect();

		epub.resources
			.iter()
			.filter(|(id, _)| !spine_idrefs.contains(id.as_str()))
			.map(|(_, resource)| {
				let href = resource.path.to_string_lossy().to_string();
				RWPMLink::new(self.resource_url(&href), Some(resource.mime.clone()))
			})
			.collect()
	}

	fn generate_toc(&self, epub: &EpubDoc<BufReader<File>>) -> Vec<RWPMLink> {
		epub.toc
			.iter()
			.map(|nav| self.nav_point_to_link(nav))
			.collect()
	}

	fn nav_point_to_link(&self, nav: &NavPoint) -> RWPMLink {
		let href = nav.content.to_string_lossy().to_string();
		RWPMLink::new(
			self.resource_url(&href),
			Some("application/xhtml+xml".to_string()),
		)
		.with_title(&nav.label)
		.with_children(
			nav.children
				.iter()
				.map(|child| self.nav_point_to_link(child))
				.collect(),
		)
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

	#[test]
	fn test_rwpm_link_builder() {
		let link = RWPMLink::new("/test.html", Some("text/html".to_string()))
			.with_title("Test")
			.with_rel("self");

		assert_eq!(link.href, "/test.html");
		assert_eq!(link.media_type, Some("text/html".to_string()));
		assert_eq!(link.title, Some("Test".to_string()));
		assert_eq!(link.rel, Some(vec!["self".to_string()]));
		assert!(link.children.is_empty());
	}

	#[test]
	fn test_rwpm_link_children_builder() {
		let child =
			RWPMLink::new("/child.xhtml", Some("application/xhtml+xml".to_string()))
				.with_title("Child");
		let parent =
			RWPMLink::new("/parent.xhtml", Some("application/xhtml+xml".to_string()))
				.with_title("Parent")
				.with_children(vec![child]);

		assert_eq!(parent.children.len(), 1);
		assert_eq!(parent.children[0].title, Some("Child".to_string()));
	}

	#[test]
	fn test_manifest_serialization() {
		let manifest = RWPManifest {
			context: RWPM_CONTEXT.to_string(),
			metadata: RWPMMetadata {
				title: "Test Book".to_string(),
				author: vec!["Author".to_string()],
				..Default::default()
			},
			links: vec![RWPMLink::new(
				"/manifest.json",
				Some("application/webpub+json".to_string()),
			)
			.with_rel("self")],
			reading_order: vec![RWPMLink::new(
				"/chapter1.xhtml",
				Some("application/xhtml+xml".to_string()),
			)
			.with_title("Chapter 1")],
			resources: vec![],
			toc: vec![],
		};

		let json = serde_json::to_string(&manifest).unwrap();
		assert!(json.contains("Test Book"));
		assert!(json.contains("@context"));
		assert!(json.contains("readingOrder"));
	}

	#[test]
	fn test_manifest_serialization_nested_toc() {
		let child = RWPMLink::new(
			"/OEBPS/ch1.xhtml",
			Some("application/xhtml+xml".to_string()),
		)
		.with_title("Chapter 1");
		let parent = RWPMLink::new(
			"/OEBPS/volume1.xhtml",
			Some("application/xhtml+xml".to_string()),
		)
		.with_title("Volume 1")
		.with_children(vec![child]);

		let manifest = RWPManifest {
			context: RWPM_CONTEXT.to_string(),
			metadata: RWPMMetadata {
				title: "Test Book".to_string(),
				..Default::default()
			},
			links: vec![],
			reading_order: vec![],
			resources: vec![],
			toc: vec![parent],
		};

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
