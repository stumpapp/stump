use crate::data::{CoreContext, RequestContext};
use async_graphql::{ComplexObject, Context, Result, SimpleObject};
use epub::doc::{EpubDoc, NavPoint};
use models::entity::{media, media_annotation};
use sea_orm::prelude::*;
use serde::{Deserialize, Serialize};
use std::{collections::HashMap, path::PathBuf};

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
#[graphql(complex)]
pub struct Epub {
	// TODO(graphql): use media graphql object here so that we can use the resolvers there
	pub media_entity: media::Model,

	pub spine: Vec<String>,
	pub resources: HashMap<String, (String, String)>,
	pub toc: Vec<String>,
	pub metadata: HashMap<String, Vec<String>>,
	pub root_base: String,
	pub root_file: String,
	pub extra_css: Vec<String>,
}

impl Epub {
	pub fn try_from(entity: media::Model) -> Result<Self> {
		let epub_file = EpubDoc::new(entity.path.as_str()).map_err(|e| {
			tracing::error!("Error parsing epub file: {:?}", e);
			"Error parsing epub file"
		})?;

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

		Ok(Self {
			media_entity: entity,
			spine: epub_file.spine,
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
}

#[ComplexObject]
impl Epub {
	async fn annotations(
		&self,
		ctx: &Context<'_>,
	) -> Result<Vec<media_annotation::Model>> {
		let user_id = ctx.data::<RequestContext>()?.id();
		let media_id = self.media_entity.id.clone();
		let conn = ctx.data::<CoreContext>()?.conn.as_ref();

		let sessions = media_annotation::Entity::find()
			.filter(media_annotation::Column::UserId.eq(user_id))
			.filter(media_annotation::Column::MediaId.eq(media_id))
			.all(conn)
			.await?;

		Ok(sessions)
	}
}
