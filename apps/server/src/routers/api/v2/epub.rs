use std::path::PathBuf;

use axum::{
	extract::{Path, Query, State},
	http::header,
	middleware,
	response::{IntoResponse, Response},
	routing::get,
	Extension, Json, Router,
};
use graphql::data::AuthContext;
use models::{
	entity::{media, user::AuthUser},
	shared::readium::{RWPMPositions, RWPManifest},
};
use sea_orm::prelude::*;
use serde::Deserialize;
use stump_core::filesystem::media::{
	search_epub, EpubProcessor, EpubSearchOptions, ReadiumManifestGenerator,
	EPUB_SEARCH_DEFAULT_LIMIT,
};
use tokio_util::sync::CancellationToken;

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
/// Absolute `href`s in RWPM/positions use the request [`HostExtractor`]. Behind
/// a TLS terminator, enable `trust_proxy_headers` and forward
/// `X-Forwarded-Proto` / `Forwarded`.
pub(crate) fn mount(app_state: AppState) -> Router<AppState> {
	Router::new()
		.nest(
			"/epub/{id}",
			Router::new()
				.route("/manifest.json", get(get_epub_manifest))
				.route("/positions.json", get(get_epub_positions))
				.route("/search", get(get_epub_search))
				.route("/resource/{*path}", get(get_epub_resource)),
		)
		.layer(middleware::from_fn_with_state(app_state, auth_middleware))
}

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

/// Resolve the request-scoped base URL used in RWPM absolute resource links.
fn epub_service_base_url(host_details: &HostDetails, id: &str) -> String {
	host_details.url_for_path(&format!("api/v2/epub/{id}"))
}

struct WebPubManifestResponse(RWPManifest);

impl IntoResponse for WebPubManifestResponse {
	fn into_response(self) -> Response {
		(
			[(header::CONTENT_TYPE, "application/webpub+json")],
			Json(self.0),
		)
			.into_response()
	}
}

struct WebPubPositionsResponse(RWPMPositions);

impl IntoResponse for WebPubPositionsResponse {
	fn into_response(self) -> Response {
		(
			[(
				header::CONTENT_TYPE,
				"application/vnd.readium.position-list+json",
			)],
			Json(self.0),
		)
			.into_response()
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
) -> APIResult<WebPubManifestResponse> {
	let AuthContext { user, .. } = req;
	let ebook = find_ebook_for_user(ctx.conn.as_ref(), &user, &id).await?;

	let base_url = epub_service_base_url(&host_details, &id);
	let generator = ReadiumManifestGenerator::new(&ebook.path, base_url);
	let manifest = generator.generate_manifest()?;

	Ok(WebPubManifestResponse(manifest))
}

/// Get the positions list for an epub file
///
/// See: https://readium.org/architecture/models/locators/positions/
async fn get_epub_positions(
	Path(id): Path<String>,
	State(ctx): State<AppState>,
	Extension(req): Extension<AuthContext>,
	HostExtractor(host_details): HostExtractor,
) -> APIResult<WebPubPositionsResponse> {
	let AuthContext { user, .. } = req;
	let ebook = find_ebook_for_user(ctx.conn.as_ref(), &user, &id).await?;

	let base_url = epub_service_base_url(&host_details, &id);
	let generator = ReadiumManifestGenerator::new(&ebook.path, base_url);
	let positions = generator.generate_positions()?;

	Ok(WebPubPositionsResponse(positions))
}

#[derive(Debug, Deserialize)]
struct EpubSearchQueryParams {
	q: String,
	#[serde(default = "default_search_limit")]
	limit: usize,
	cursor: Option<String>,
}

fn default_search_limit() -> usize {
	EPUB_SEARCH_DEFAULT_LIMIT
}

/// Bounded whole-book search over EPUB spine XHTML.
///
/// Returns plain-text excerpts and Readium locators. Does not require
/// `DownloadFile` — the scan never ships the archive to the client.
async fn get_epub_search(
	Path(id): Path<String>,
	Query(params): Query<EpubSearchQueryParams>,
	State(ctx): State<AppState>,
	Extension(req): Extension<AuthContext>,
	HostExtractor(host_details): HostExtractor,
) -> APIResult<impl IntoResponse> {
	let AuthContext { user, .. } = req;
	let ebook = find_ebook_for_user(ctx.conn.as_ref(), &user, &id).await?;
	let base_url = epub_service_base_url(&host_details, &id);

	let cursor = match params.cursor.as_deref() {
		Some(raw) if !raw.is_empty() => Some(EpubSearchOptions::decode_cursor(raw)?),
		_ => None,
	};

	let options = EpubSearchOptions::new(params.q)
		.with_limit(params.limit)
		.with_cursor(cursor);
	options.validate()?;

	let cancel = CancellationToken::new();
	let cancel_for_task = cancel.clone();
	let path = ebook.path.clone();

	// Dropping the request future cancels the token so the blocking scan can stop.
	let _guard = cancel.drop_guard();

	let response = tokio::task::spawn_blocking(move || {
		search_epub(&path, &base_url, options, &cancel_for_task)
	})
	.await
	.map_err(|e| APIError::InternalServerError(e.to_string()))??;

	Ok(Json(response))
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
