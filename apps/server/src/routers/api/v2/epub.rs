use std::path::PathBuf;

use axum::{
	extract::{Path, State},
	middleware,
	routing::get,
	Extension, Router,
};
use graphql::data::AuthContext;
use models::entity::media;
use sea_orm::prelude::*;
use stump_core::filesystem::media::EpubProcessor;

use crate::{
	config::state::AppState,
	errors::{APIError, APIResult},
	middleware::auth::auth_middleware,
	utils::http::BufferResponse,
};

pub(crate) fn mount(app_state: AppState) -> Router<AppState> {
	Router::new()
		.nest(
			"/epub/{id}",
			Router::new()
				.route("/chapter/{chapter}", get(get_epub_chapter))
				.route("/{root}/{resource}", get(get_epub_meta)),
		)
		.layer(middleware::from_fn_with_state(app_state, auth_middleware))
}

/// Get a resource from an epub file. META-INF is a reserved `root` query parameter, which will
/// grab a resource by resource ID (e.g. `META-INF/container.xml`, where `container.xml` is the
/// resource ID). Otherwise, the `resource` query parameter represents the path to the requested
/// resource. (e.g. `/EPUB/chapter1.xhtml`, where `EPUB` is the root and `chapter1.xhtml` is
/// the resource path)
async fn get_epub_chapter(
	Path((id, chapter)): Path<(String, usize)>,
	State(ctx): State<AppState>,
	Extension(req): Extension<AuthContext>,
) -> APIResult<BufferResponse> {
	let AuthContext { user, .. } = req;

	let ebook = media::Entity::find_for_user(&user)
		.filter(media::Column::Id.eq(id.clone()))
		.into_model::<media::MediaIdentSelect>()
		.one(ctx.conn.as_ref())
		.await?
		.ok_or_else(|| APIError::NotFound("Book not found".to_string()))?;

	Ok(EpubProcessor::get_chapter(ebook.path.as_str(), chapter)?.into())
}

/// Get a resource from an epub file. META-INF is a reserved `root` query parameter, which will
/// grab a resource by resource ID (e.g. `META-INF/container.xml`, where `container.xml` is the
/// resource ID). Otherwise, the `resource` query parameter represents the path to the requested
/// resource. (e.g. `/EPUB/chapter1.xhtml`, where `EPUB` is the root and `chapter1.xhtml` is
/// the resource path)
async fn get_epub_meta(
	Path((id, root, resource)): Path<(String, String, PathBuf)>,
	State(ctx): State<AppState>,
	Extension(req): Extension<AuthContext>,
) -> APIResult<BufferResponse> {
	let AuthContext { user, .. } = req;

	let ebook = media::Entity::find_for_user(&user)
		.filter(media::Column::Id.eq(id.clone()))
		.into_model::<media::MediaIdentSelect>()
		.one(ctx.conn.as_ref())
		.await?
		.ok_or_else(|| APIError::NotFound("Book not found".to_string()))?;

	if root == "META-INF" {
		// reserved for accessing resources via resource id
		Ok(EpubProcessor::get_resource_by_id(
			ebook.path.as_str(),
			resource.to_str().unwrap_or_default(),
		)?
		.into())
	} else {
		// NOTE: when a resource is loaded from a path, it is likely something inside the contents of an epub page,
		// such as a css file or an image file.
		Ok(EpubProcessor::get_resource_by_path(
			ebook.path.as_str(),
			root.as_str(),
			resource,
		)?
		.into())
	}
}
