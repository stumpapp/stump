use axum::Router;
use graphql::data::AuthContext;

use crate::config::state::AppState;

pub(crate) mod v1_2;
pub(crate) mod v2_0;

/// Resolve the OPDS locale from the authenticated user's language preference.
///
/// Every OPDS auth path loads the user's preferences, so OPDS follows the same
/// language as the web UI. Language-only codes are mapped to the closest
/// available locale; unknown locales fall back to `en-US`.
pub(crate) fn opds_locale(req: &AuthContext) -> String {
	let preference = req
		.user
		.preferences
		.as_ref()
		.map(|preferences| preferences.locale.as_str())
		.unwrap_or("en-US");

	resolve_locale(preference)
}

fn resolve_locale(preference: &str) -> String {
	let normalized = preference.replace('_', "-").to_ascii_lowercase();
	let available = rust_i18n::available_locales!();

	if let Some(exact) = available
		.iter()
		.find(|locale| locale.eq_ignore_ascii_case(&normalized))
	{
		return exact.to_string();
	}

	if normalized.starts_with("zh-hk")
		|| normalized.starts_with("zh-mo")
		|| normalized.starts_with("zh-hant")
	{
		return "zh-TW".to_string();
	}

	let language = normalized.split('-').next().unwrap_or("en");
	let preferred = match language {
		"en" => "en-US",
		"zh" => "zh-CN",
		"pt" => "pt-BR",
		_ => "",
	};
	if !preferred.is_empty() {
		return preferred.to_string();
	}

	let prefix = format!("{language}-");
	available
		.iter()
		.find(|locale| locale.to_ascii_lowercase().starts_with(&prefix))
		.map(|locale| locale.to_string())
		.unwrap_or_else(|| "en-US".to_string())
}

pub(crate) fn mount(app_state: AppState) -> Router<AppState> {
	Router::new().nest(
		"/opds",
		Router::new()
			.merge(v1_2::mount(app_state.clone()))
			.merge(v2_0::mount(app_state)),
	)
}

#[cfg(test)]
mod tests {
	use super::resolve_locale;

	#[test]
	fn resolves_language_only_locales() {
		assert_eq!(resolve_locale("en"), "en-US");
		assert_eq!(resolve_locale("zh"), "zh-CN");
		assert_eq!(resolve_locale("zh_TW"), "zh-TW");
		assert_eq!(resolve_locale("fr"), "fr-FR");
		assert_eq!(resolve_locale("not-a-locale"), "en-US");
	}

	#[test]
	fn translates_opds_titles() {
		assert_eq!(
			rust_i18n::t!("opds.libraries", locale = "zh-CN").to_string(),
			"书库"
		);
		assert_eq!(
			rust_i18n::t!("opds.keepReading.title", locale = "zh-CN").to_string(),
			"继续阅读"
		);
	}
}
