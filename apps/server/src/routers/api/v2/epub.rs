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
use models::entity::{media, server_config, user::AuthUser};
use sea_orm::prelude::*;
use stump_core::filesystem::media::{EpubProcessor, ReadiumManifestGenerator};

use crate::{
	config::state::AppState,
	errors::{APIError, APIResult},
	middleware::{auth::auth_middleware, host::HostDetails, HostExtractor},
	utils::http::BufferResponse,
};

/// EPUB package streaming routes.
///
/// Auth model matches comic page streaming: `auth_middleware` plus
/// [`media::Entity::find_for_user`]. These routes do not require
/// `DownloadFile` — that permission applies only to full-archive download
/// via `GET /api/v2/media/{id}/file`.
///
/// Absolute `href`s in RWPM/positions prefer `server_config.public_url` when
/// set; otherwise they use the request [`HostExtractor`]. Behind a TLS
/// terminator without `public_url`, enable `trust_proxy_headers` and forward
/// `X-Forwarded-Proto` / `Forwarded`.
pub(crate) fn mount(app_state: AppState) -> Router<AppState> {
	Router::new()
		.nest(
			"/epub/{id}",
			Router::new()
				.route("/chapter/{chapter}", get(get_epub_chapter))
				// Static + splat routes before `/{root}/{resource}` so they are not swallowed.
				.route("/manifest.json", get(get_epub_manifest))
				.route("/positions.json", get(get_epub_positions))
				.route("/resource/{*path}", get(get_epub_resource))
				.route("/{root}/{resource}", get(get_epub_meta)),
		)
		.layer(middleware::from_fn_with_state(app_state, auth_middleware))
}

// TODO(readium): Can probably kill the get_epub_meta and legacy chapter routes once
// the web client fully migrates to rwpm streaming.

async fn find_ebook_for_user(
	conn: &DatabaseConnection,
	user: &AuthUser,
	id: &str,
) -> APIResult<media::MediaIdentSelect> {
	media::Entity::find_for_user(user)
		.filter(media::Column::Id.eq(id.to_string()))
		.into_model::<media::MediaIdentSelect>()
		.one(conn)
		.await?
		.ok_or_else(|| APIError::NotFound("Book not found".to_string()))
}

/// Resolve the public base URL used in RWPM absolute resource links.
async fn epub_service_base_url(
	conn: &DatabaseConnection,
	host_details: &HostDetails,
	id: &str,
) -> APIResult<String> {
	let origin = match server_config::Entity::find().one(conn).await? {
		Some(config) => config
			.public_url
			.filter(|url| !url.is_empty())
			.unwrap_or_else(|| host_details.url()),
		None => host_details.url(),
	};

	Ok(format!("{origin}/api/v2/epub/{id}"))
}

/// Get a chapter from an epub file by spine index.
async fn get_epub_chapter(
	Path((id, chapter)): Path<(String, usize)>,
	State(ctx): State<AppState>,
	Extension(req): Extension<AuthContext>,
) -> APIResult<BufferResponse> {
	let AuthContext { user, .. } = req;
	let ebook = find_ebook_for_user(ctx.conn.as_ref(), &user, &id).await?;

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
	let ebook = find_ebook_for_user(ctx.conn.as_ref(), &user, &id).await?;

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
	let ebook = find_ebook_for_user(ctx.conn.as_ref(), &user, &id).await?;

	let base_url = epub_service_base_url(ctx.conn.as_ref(), &host_details, &id).await?;
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
	let ebook = find_ebook_for_user(ctx.conn.as_ref(), &user, &id).await?;

	let base_url = epub_service_base_url(ctx.conn.as_ref(), &host_details, &id).await?;
	let generator = ReadiumManifestGenerator::new(&ebook.path, base_url);
	let positions = generator.generate_positions()?;

	Ok((
		[(
			header::CONTENT_TYPE,
			"application/vnd.readium.position-list+json",
		)],
		Json(positions),
	))
}

/// Get a resource from an epub file by package-relative path.
///
/// Paths may be nested (e.g. `OEBPS/Images/cover.jpg`). Axum percent-decodes
/// path segments before extraction.
async fn get_epub_resource(
	Path((id, path)): Path<(String, String)>,
	State(ctx): State<AppState>,
	Extension(req): Extension<AuthContext>,
) -> APIResult<BufferResponse> {
	let AuthContext { user, .. } = req;
	let ebook = find_ebook_for_user(ctx.conn.as_ref(), &user, &id).await?;

	// Drop leading slash / fragments if a client accidentally includes them.
	let path = path.trim_start_matches('/');
	let path = path.split_once('#').map(|(p, _)| p).unwrap_or(path);
	let path_buf = PathBuf::from(path);

	if let Some(parent) = path_buf.parent() {
		if let Some(file_name) = path_buf.file_name() {
			let root = parent.to_string_lossy().to_string();
			let resource = PathBuf::from(file_name);
			let root_str = if root.is_empty() { "" } else { root.as_str() };

			return Ok(EpubProcessor::get_resource_by_path(
				ebook.path.as_str(),
				root_str,
				resource,
			)?
			.into());
		}
	}

	Ok(EpubProcessor::get_resource_by_path(ebook.path.as_str(), "", path_buf)?.into())
}
