use axum::Router;
use graphql::data::AuthContext;
use stump_core::opds::i18n::{self, Locale, Text};

use crate::config::state::AppState;

pub(crate) mod v1_2;
pub(crate) mod v2_0;

/// Resolve OPDS text from the authenticated user's locale preference.
pub(crate) fn opds_strings(req: &AuthContext) -> &'static Text {
	let locale = req
		.user
		.preferences
		.as_ref()
		.map(|preferences| Locale::from_preference(&preferences.locale))
		.unwrap_or_default();

	i18n::text(locale)
}

pub(crate) fn mount(app_state: AppState) -> Router<AppState> {
	Router::new().nest(
		"/opds",
		Router::new()
			.merge(v1_2::mount(app_state.clone()))
			.merge(v2_0::mount(app_state)),
	)
}
