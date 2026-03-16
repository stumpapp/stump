use axum::{
	extract::{Path, Request, State},
	middleware::{self, Next},
	response::{Json, Response},
	routing::get,
	Extension, Router,
};
use chrono::Utc;
use graphql::data::AuthContext;
use models::shared::enums::UserPermission;
use serde::{Deserialize, Serialize};

use crate::{
	config::state::AppState,
	errors::{APIError, APIResult},
	middleware::auth::api_key_middleware,
	routers::kobo::sync_types::*,
};

#[derive(Debug, Serialize, Deserialize)]
struct KoboURLParams {
	api_key: String,
}

/// Mounts the koreader sync router at `/kobo` (from the parent router).
/// These endpoints are not documented anywhere, but Komga's reverse-engineered
/// implementation is a decent place to start.
pub(crate) fn mount(app_state: AppState) -> Router<AppState> {
	Router::new().nest(
		"/{api_key}",
		Router::new()
			.route("/v1/library/sync", get(library_sync))
			.layer(middleware::from_fn(authorize)) // Note the order!
			.layer(middleware::from_fn_with_state(
				app_state,
				api_key_middleware,
			)),
	)
}

/// A secondary authorization middleware to ensure that the user has access to the
/// kobo sync endpoints. This is purely for convenience
async fn authorize(req: Request, next: Next) -> APIResult<Response> {
	let ctx = req
		.extensions()
		.get::<AuthContext>()
		.ok_or(APIError::Unauthorized)?;
	// TODO FIXME
	ctx.enforce_permissions(&[UserPermission::AccessKoreaderSync])
		.map_err(|_| {
			APIError::Forbidden("You do not have permission to use Kobo sync".to_string())
		})?;
	Ok(next.run(req).await)
}

async fn library_sync(
	State(ctx): State<AppState>,
	Extension(req): Extension<AuthContext>,
	Path(KoboURLParams { api_key, .. }): Path<KoboURLParams>,
) -> APIResult<Json<Vec<SyncItem>>> {
	let _conn = ctx.conn.as_ref();
	let _user = req.user();

	let id: String = "1234".to_string();

	let base_url = "http://192.168.4.100:25601";
	let book_url = format!("{}/kobo/{}/v1/books/{}/file/epub", base_url, api_key, id);

	let item = SyncItem::NewEntitlement(NewEntitlement {
      book_entitlement: BookEntitlement {
			accessibility: "Full".to_string(),
			active_period: Period { from: Utc::now() },
			created: Utc::now(),
      cross_revision_id: id.clone(),
      id: id.clone(),
      is_hidden_from_archive: false,
      is_locked: false,
      is_removed: false,
      last_modified: Utc::now(),
      origin_category: "Imported".to_string(),
      revision_id: id.clone(),
      status: "Active".to_string(),
    },
    book_metadata: BookMetadata {
        categories: vec![
            "00000000-0000-0000-0000-000000000001".to_string(),
        ],
        contributor_roles: vec![
            ContributorRole {
                name: "Rex Stout".to_string(),
            }
        ],
        contributors: vec![
            "Rex Stout".to_string(),
        ],
        cover_image_id: "0PSKKSGSRRBES".to_string(),
        cross_revision_id: id.clone(),
        current_display_price: DisplayPrice {
            currency_code: "USD".to_string(),
            total_amount: 0,
        },
        current_love_display_price: LoveDisplayPrice {
            total_amount: 0,
        },
        description: "A prize bull, a restaurateur's tacky publicity stunt, a family feud (among the bull's owners), and the death of a family scion pit Nero Wolfe and Archie Goodwin against a special breed of killer.".to_string(),
        download_urls: vec![
            DownloadUrl {
                drm_type: "None".to_string(),
                format: "EPUB3".to_string(),
                size: 2_848_252,
                platform: "Generic".to_string(),
                url: book_url,
            }
        ],
        entitlement_id: id.clone(),
        external_ids: vec![],
        genre: "00000000-0000-0000-0000-000000000001".to_string(),
        is_eligible_for_kobo_love: false,
        is_internet_archive: false,
        is_pre_order: false,
        is_social_enabled: true,
        isbn: "9780307756190".to_string(),
        language: "en".to_string(),
        phonetic_pronunciations: Empty{},
        publication_date: Utc::now(),
        publisher: Publisher {
            imprint: "".to_string(),
            name: "Random House Publishing Group".to_string(),
        },
        revision_id: id.clone(),
        series: Series {
            id: "0PSKKSF6WR6RC".to_string(),
            name: "library".to_string(),
            number: "1".to_string(),
            number_float: 1.0,
        },
        title: "Rex Stout - Nero Wolfe 06 - Some Buried Caesar".to_string(),
        work_id: id.clone(),
    },
    reading_state: ReadingState {
        created: Utc::now(),
        current_bookmark: CurrentBookmark {
            last_modified: Utc::now(),
        },
        entitlement_id: id.clone(),
        last_modified: Utc::now(),
        priority_timestamp: Utc::now(),
        statistics: Statistics {
            last_modified: Utc::now(),
        },
        status_info: StatusInfo {
            last_modified: Utc::now(),
            status: "ReadyToRead".to_string(),
            times_started_reading: 0,
        },
    }
  });

	Ok(Json(vec![item]))
}
