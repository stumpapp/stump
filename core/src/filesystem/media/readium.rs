use std::{collections::HashMap, fs::File, io::BufReader, path::PathBuf};

use epub::doc::EpubDoc;
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
		let mut epub = EpubDoc::new(&self.epub_path)
			.map_err(|e| FileError::EpubOpenError(e.to_string()))?;

		let num_pages = epub.get_num_pages();

		struct PositionData {
			href: String,
			media_type: String,
			title: Option<String>,
			size: usize,
		}

		let items: Vec<PositionData> = (0..num_pages)
			.filter_map(|i| {
				epub.set_current_page(i);

				let spine_item = epub.spine.get(i)?;
				let resource = epub.resources.get(&spine_item.idref).or_else(|| {
					tracing::warn!(
						page = i,
						spine_idref = %spine_item.idref,
						epub_path = %self.epub_path,
						"Spine item not found in resources! Skipping for positions. This may affect accuracy of positions"
					);
					None
				})?;

		 		let href = resource.path.to_string_lossy().to_string();

				let media_type = epub
					.get_current_mime()
					.unwrap_or_else(|| "application/xhtml+xml".to_string());

				let title = epub.toc
					.iter()
					.find(|nav| nav.content.to_string_lossy().contains(&spine_item.idref))
					.map(|nav| nav.label.clone());


				let size = match epub.get_current() {
					Some((content, _)) => content.len(),
					None => {
						tracing::warn!(
							page = i,
							epub_path = %self.epub_path,
							"Failed to read content for page, defaulting to reasonable size but this may affect accuracy of positions"
						);
						1000
					},
				};

				Some(PositionData {
					href,
					media_type,
					title,
					size,
				})
			})
			.collect();

		let total_size: usize = items.iter().map(|p| p.size).sum();
		let total_size = total_size.max(1); // Avoid division by zero

		let mut cumulative_size: usize = 0;
		let positions: Vec<RWPMPosition> = items
			.into_iter()
			.enumerate()
			.map(|(i, item)| {
				let total_progression = cumulative_size as f64 / total_size as f64;
				cumulative_size += item.size;

				RWPMPosition {
					href: self.resource_url(&item.href),
					media_type: item.media_type,
					title: item.title,
					locations: RWPMPositionLocations {
						position: (i + 1) as u32,
						progression: 0.0,
						total_progression,
					},
				}
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
			number_of_pages: Some(epub.get_num_pages() as u32),
			reading_progression: Some(
				get_first("direction").unwrap_or_else(|| "ltr".to_string()),
			),
		}
	}

	fn generate_links(&self) -> Vec<RWPMLink> {
		vec![RWPMLink::new(
			format!("{}/manifest.json", self.base_url),
			Some("application/webpub+json".to_string()),
		)
		.with_rel("self")]
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
			.map(|nav| {
				let href = nav.content.to_string_lossy().to_string();
				RWPMLink::new(
					self.resource_url(&href),
					Some("application/xhtml+xml".to_string()),
				)
				.with_title(&nav.label)
			})
			.collect()
	}

	fn resource_url(&self, path: &str) -> String {
		let normalized_path = path.trim_start_matches('/');
		format!("{}/resource/{}", self.base_url, normalized_path)
	}
}

#[cfg(test)]
mod tests {
	use super::*;

	#[test]
	fn test_rwpm_link_builder() {
		let link = RWPMLink::new("/test.html", Some("text/html".to_string()))
			.with_title("Test")
			.with_rel("self");

		assert_eq!(link.href, "/test.html");
		assert_eq!(link.media_type, Some("text/html".to_string()));
		assert_eq!(link.title, Some("Test".to_string()));
		assert_eq!(link.rel, Some(vec!["self".to_string()]));
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
}
