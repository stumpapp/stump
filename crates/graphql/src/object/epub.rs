use crate::data::{AuthContext, CoreContext};
use async_graphql::{ComplexObject, Context, Result, SimpleObject};
use epub::doc::{EpubDoc, NavPoint};
use models::entity::{bookmark, media, media_annotation};
use sea_orm::prelude::*;
use serde::{Deserialize, Serialize};
use std::io::{Read, Seek};
use std::{collections::HashMap, path::PathBuf};

use super::bookmark::Bookmark;
use super::media::Media;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EpubContent {
	label: String,
	content: PathBuf,
	children: Vec<EpubContent>,
	play_order: u32,
}

impl From<NavPoint> for EpubContent {
	fn from(nav_point: NavPoint) -> EpubContent {
		EpubContent {
			label: nav_point.label,
			content: nav_point.content,
			children: nav_point
				.children
				.into_iter()
				.map(EpubContent::from)
				.collect(),
			play_order: nav_point.play_order as u32,
		}
	}
}

#[derive(Debug, Clone, SimpleObject)]
pub struct SpineItem {
	pub idref: String,
	pub id: Option<String>,
	pub properties: Option<String>,
	pub linear: bool,
}

#[derive(Debug, Clone, SimpleObject)]
#[graphql(complex)]
pub struct Epub {
	pub media_id: String,
	pub spine: Vec<SpineItem>,
	pub resources: HashMap<String, (String, String)>,
	pub toc: Vec<String>,
	pub metadata: HashMap<String, Vec<String>>,
	pub root_base: String,
	pub root_file: String,
	pub extra_css: Vec<String>,
}

impl Epub {
	fn try_from_with_epub<R: Read + Seek>(
		ident: media::MediaIdentSelect,
		epub_file: EpubDoc<R>,
	) -> Result<Self> {
		// convert path buf to string, return error if any path fails to serialize
		let resources_serialized = epub_file
			.resources
			.into_iter()
			.map(|(k, v)| Ok((k, (v.0.to_str().ok_or("Invalid path")?.to_string(), v.1))))
			.collect::<Result<HashMap<String, (String, String)>>>()?;

		// serialize toc to string, return error if any path fails to serialize
		let toc_serialized = epub_file
			.toc
			.into_iter()
			.map(|x| Ok(serde_json::to_string(&EpubContent::from(x))?))
			.collect::<Result<Vec<String>>>()?;

		let spine = epub_file
			.spine
			.into_iter()
			.map(|x| SpineItem {
				idref: x.idref,
				id: x.id,
				properties: x.properties,
				linear: x.linear,
			})
			.collect();

		Ok(Self {
			media_id: ident.id,
			spine,
			resources: resources_serialized,
			toc: toc_serialized,
			metadata: epub_file.metadata,
			root_base: epub_file
				.root_base
				.to_str()
				.ok_or("Invalid path")?
				.to_string(),
			root_file: epub_file
				.root_file
				.to_str()
				.ok_or("Invalid path")?
				.to_string(),
			extra_css: epub_file.extra_css,
		})
	}

	pub fn try_from(ident: media::MediaIdentSelect) -> Result<Self> {
		let epub_file = EpubDoc::new(ident.path.as_str()).map_err(|e| {
			tracing::error!("Error parsing epub file: {:?}", e);
			"Error parsing epub file"
		})?;
		Self::try_from_with_epub(ident, epub_file)
	}
}

#[ComplexObject]
impl Epub {
	async fn annotations(
		&self,
		ctx: &Context<'_>,
	) -> Result<Vec<media_annotation::Model>> {
		let user_id = ctx.data::<AuthContext>()?.id();
		let media_id = self.media_id.clone();
		let conn = ctx.data::<CoreContext>()?.conn.as_ref();

		let sessions = media_annotation::Entity::find()
			.filter(media_annotation::Column::UserId.eq(user_id))
			.filter(media_annotation::Column::MediaId.eq(media_id))
			.all(conn)
			.await?;

		Ok(sessions)
	}

	async fn bookmarks(&self, ctx: &Context<'_>) -> Result<Vec<Bookmark>> {
		let AuthContext { user, .. } = ctx.data::<AuthContext>()?;
		let conn = ctx.data::<CoreContext>()?.conn.as_ref();
		if self.media_id.is_empty() {
			return Err("Media ID not set".into());
		}

		let id = self.media_id.clone();

		Ok(
			bookmark::Entity::find_for_user_and_media_id(user, id.as_ref())
				.into_model::<bookmark::Model>()
				.all(conn)
				.await?
				.into_iter()
				.map(Bookmark::from)
				.collect(),
		)
	}

	async fn media(&self, ctx: &Context<'_>) -> Result<Media> {
		let conn = ctx.data::<CoreContext>()?.conn.as_ref();

		let model = media::ModelWithMetadata::find_by_id(self.media_id.clone())
			.into_model::<media::ModelWithMetadata>()
			.one(conn)
			.await?
			.ok_or("Media not found")?;

		Ok(model.into())
	}
}

#[cfg(test)]
mod tests {
	use super::*;
	use models::entity::media::MediaIdentSelect;
	#[tokio::test]
	async fn test_epub_try_from() {
		let mut epub_doc = EpubDoc::mock().unwrap();
		epub_doc.resources.insert(
			"test.css".to_string(),
			(PathBuf::from("test.css"), "text/css".to_string()),
		);
		epub_doc.toc = vec![NavPoint {
			label: "test".to_string(),
			content: PathBuf::from("test.html"),
			children: vec![],
			play_order: 0,
		}];
		epub_doc.root_base = PathBuf::from("/");
		epub_doc.root_file = PathBuf::from("test.html");
		let epub = Epub::try_from_with_epub(
			MediaIdentSelect {
				id: "test".to_string(),
				path: "test.epub".to_string(),
			},
			epub_doc,
		)
		.unwrap();
		assert_eq!(epub.media_id, "test");
		assert_eq!(epub.resources.get("test.css").unwrap().0, "test.css");
		assert_eq!(epub.resources.get("test.css").unwrap().1, "text/css");
		assert_eq!(epub.toc.len(), 1);
		assert_eq!(epub.toc[0], "{\"label\":\"test\",\"content\":\"test.html\",\"children\":[],\"play_order\":0}".to_string());
		assert_eq!(epub.root_base, "/");
		assert_eq!(epub.root_file, "test.html");
	}
	// Test for malformed epub file, non-utf8 path are os dependent so only run on linux
	#[cfg(target_os = "linux")]
	#[tokio::test]
	async fn test_epub_try_from_malformed() {
		use std::ffi::OsString;
		use std::os::unix::ffi::OsStringExt;
		let malformed_path = PathBuf::from(OsString::from_vec(vec![255]));
		let mut epub_doc = EpubDoc::mock().unwrap();
		epub_doc.resources.insert(
			"test.css".to_string(),
			(malformed_path.clone(), "text/css".to_string()),
		);
		let epub = Epub::try_from_with_epub(
			MediaIdentSelect {
				id: "test".to_string(),
				path: "test.epub".to_string(),
			},
			epub_doc,
		);
		assert!(epub.is_err());
		// try with toc
		epub_doc = EpubDoc::mock().unwrap();
		epub_doc.toc = vec![NavPoint {
			label: "test".to_string(),
			content: malformed_path.clone(),
			children: vec![],
			play_order: 0,
		}];
		let epub = Epub::try_from_with_epub(
			MediaIdentSelect {
				id: "test".to_string(),
				path: "test.epub".to_string(),
			},
			epub_doc,
		);
		assert!(epub.is_err());
		// try with base file
		epub_doc = EpubDoc::mock().unwrap();
		epub_doc.root_base = malformed_path.clone();
		let epub = Epub::try_from_with_epub(
			MediaIdentSelect {
				id: "test".to_string(),
				path: "test.epub".to_string(),
			},
			epub_doc,
		);
		assert!(epub.is_err());
	}
}
