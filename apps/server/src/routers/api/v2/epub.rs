use std::path::PathBuf;

use axum::{
	extract::{Path, State},
	http::header,
	middleware,
	response::IntoResponse,
	routing::get,
	Extension, Json, Router,
};
use graphql::data::AuthContext;
use models::entity::media;
use sea_orm::prelude::*;
use stump_core::filesystem::media::{EpubProcessor, ReadiumManifestGenerator};

use crate::{
	config::state::AppState,
	errors::{APIError, APIResult},
	middleware::{auth::auth_middleware, host::HostExtractor},
	utils::http::BufferResponse,
};

pub(crate) fn mount(app_state: AppState) -> Router<AppState> {
	Router::new()
		.nest(
			"/epub/{id}",
			Router::new()
				.route("/chapter/{chapter}", get(get_epub_chapter))
				.route("/manifest.json", get(get_epub_manifest))
				.route("/positions.json", get(get_epub_positions))
				.route("/resource/{*path}", get(get_epub_resource))
				.route("/{root}/{resource}", get(get_epub_meta)),
		)
		.layer(middleware::from_fn_with_state(app_state, auth_middleware))
}

// TODO(readium): Can probably kill the get_epub_meta and get_epub_resource endpoints now that I am
// implementing rwpm, also, conveniently, this kinda solves the epub streaming features which is sick

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

/// Get the Readium Web Publication Manifest for an epub file
///
/// See: https://readium.org/webpub-manifest/
async fn get_epub_manifest(
	Path(id): Path<String>,
	State(ctx): State<AppState>,
	Extension(req): Extension<AuthContext>,
	HostExtractor(host_details): HostExtractor,
) -> APIResult<impl IntoResponse> {
	let AuthContext { user, .. } = req;

	let ebook = media::Entity::find_for_user(&user)
		.filter(media::Column::Id.eq(id.clone()))
		.into_model::<media::MediaIdentSelect>()
		.one(ctx.conn.as_ref())
		.await?
		.ok_or_else(|| APIError::NotFound("Book not found".to_string()))?;

	let base_url = format!("{}/api/v2/epub/{}", host_details.url(), id);
	let generator = ReadiumManifestGenerator::new(&ebook.path, base_url);
	let manifest = generator.generate_manifest()?;

	Ok((
		[(header::CONTENT_TYPE, "application/webpub+json")],
		Json(manifest),
	))
}

/// Get the positions list for an epub file
///
/// See: https://readium.org/architecture/models/locators/positions/
async fn get_epub_positions(
	Path(id): Path<String>,
	State(ctx): State<AppState>,
	Extension(req): Extension<AuthContext>,
	HostExtractor(host_details): HostExtractor,
) -> APIResult<impl IntoResponse> {
	let AuthContext { user, .. } = req;

	let ebook = media::Entity::find_for_user(&user)
		.filter(media::Column::Id.eq(id.clone()))
		.into_model::<media::MediaIdentSelect>()
		.one(ctx.conn.as_ref())
		.await?
		.ok_or_else(|| APIError::NotFound("Book not found".to_string()))?;

	let base_url = format!("{}/api/v2/epub/{}", host_details.url(), id);
	let generator = ReadiumManifestGenerator::new(&ebook.path, base_url);
	let positions = generator.generate_positions()?;

	Ok(Json(positions))
}

/// Get a resource from an epub file by path
async fn get_epub_resource(
	Path((id, path)): Path<(String, String)>,
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

	// E.g. "OEBPS/chapter1.xhtml" or "chapter1.xhtml"
	let path_buf = PathBuf::from(&path);

	if let Some(parent) = path_buf.parent() {
		if let Some(file_name) = path_buf.file_name() {
			let root = parent.to_string_lossy().to_string();
			let resource = PathBuf::from(file_name);

			let root_str = if root.is_empty() { "" } else { &root };

			return Ok(EpubProcessor::get_resource_by_path(
				ebook.path.as_str(),
				root_str,
				resource,
			)?
			.into());
		}
	}

	let resource = PathBuf::from(&path);
	Ok(EpubProcessor::get_resource_by_path(ebook.path.as_str(), "", resource)?.into())
}
