//! The shared localization for Stump backend crates. See the
//! following guide for reference: https://github.com/longbridge/rust-i18n/tree/main/examples/share-in-workspace

// TODO: per ^ example, it used a backend struct that seemed unnecessary at a glance, but may be important to revisit with
// more focused eyes at a later time

rust_i18n::i18n!("locales", fallback = "en-US");

/// Re-export of the translate macro from `rust_i18n` just in case, but really
/// should use [translate]
pub use rust_i18n::t;

/// A shorthand for getting a translated string provided an authenticated request, pulling
/// the locale from the user preferences and passing to rust_i18n
///
/// ```rust
/// use i18n::translate;
/// # struct Preferences { locale: String }
/// # struct User { preferences: Option<Preferences> }
/// # struct Auth { user: User }
/// # let req = Auth { user: User { preferences: None } };
/// # let var = String::from("value");
///
/// // basic example no templating
/// let my_string = translate!(&req, "a-key").to_string();
///
/// // example with basic string var in template
/// let my_templated_string = translate!(
///     &req,
///     "a-key-with-var",
///     var = var.as_str()
/// )
/// .to_string();
#[macro_export]
macro_rules! translate {
	($auth:expr, $key:literal $(, $name:ident = $value:expr)* $(,)?) => {{
		let __stump_auth = &$auth;
		let __stump_preference = __stump_auth
			.user
			.preferences
			.as_ref()
			.map(|preferences| preferences.locale.as_str())
			.unwrap_or("en-US");
		let __locale = $crate::resolve_locale(__stump_preference);

		$crate::translate_for_locale(
			__locale.as_str(),
			$key,
			&[$(
				(stringify!($name), ::std::format!("{}", $value)),
			)*],
		)
	}};
}

pub fn translate_for_locale(locale: &str, key: &str, args: &[(&str, String)]) -> String {
	let mut translated = rust_i18n::t!(key, locale = locale).to_string();

	for (name, value) in args {
		let placeholder = ::std::format!("%{{{name}}}");
		translated = translated.replace(placeholder.as_str(), value);
	}

	translated
}

pub fn resolve_locale(preference: &str) -> String {
	let normalized = preference.replace('_', "-").to_ascii_lowercase();
	let available = rust_i18n::available_locales!();

	if let Some(exact) = available
		.iter()
		.find(|locale| locale.eq_ignore_ascii_case(&normalized))
	{
		return exact.to_string();
	}

	if normalized.starts_with("zh-tw")
		|| normalized.starts_with("zh-hk")
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

#[cfg(test)]
mod tests {
	use super::resolve_locale;

	/// mimics the auth context for a server request
	struct TestAuth {
		user: TestUser,
	}

	/// mimics an AuthUser
	struct TestUser {
		preferences: Option<TestPreferences>,
	}

	/// a minimal test repr of user preferences, just to satisfy the shape required
	/// for the macro
	struct TestPreferences {
		locale: String,
	}

	/// a basic test which asserts a shape which matches the auth context
	/// will work with the macro
	#[test]
	fn test_translate_macro_uses_the_auth_context_locale() {
		let auth = TestAuth {
			user: TestUser {
				preferences: Some(TestPreferences {
					locale: "zh-CN".to_string(),
				}),
			},
		};

		assert_eq!(translate!(&auth, "opds.catalog"), "Stump OPDS 目录");
	}

	#[test]
	fn test_resolves_language_only_locales() {
		assert_eq!(resolve_locale("en"), "en-US");
		assert_eq!(resolve_locale("zh"), "zh-CN");
		assert_eq!(resolve_locale("zh_TW"), "zh-TW");
		assert_eq!(resolve_locale("fr"), "en-US");
		assert_eq!(resolve_locale("not-a-locale"), "en-US");
	}
}
