use crate::prisma::{
	media::{self, WhereParam},
	media_metadata, series, series_metadata,
};
use prisma_client_rust::{and, or};

// TODO: expose this to not maintain two copies

/// Generates a condition to enforce age restrictions on media and their corresponding
/// series.
pub fn apply_media_age_restriction(min_age: i32, restrict_on_unset: bool) -> WhereParam {
	if restrict_on_unset {
		or![
			// If the media has no age rating, then we can defer to the series age rating.
			and![
				media::metadata::is(vec![media_metadata::age_rating::equals(None)]),
				media::series::is(vec![series::metadata::is(vec![
					series_metadata::age_rating::not(None),
					series_metadata::age_rating::lte(min_age),
				])])
			],
			// If the media has an age rating, it must be under the user age restriction
			media::metadata::is(vec![
				media_metadata::age_rating::not(None),
				media_metadata::age_rating::lte(min_age),
			]),
		]
	} else {
		or![
			// If there is no media metadata at all, or it exists with no age rating, then we
			// should try to defer to the series age rating
			and![
				or![
					media::metadata::is_null(),
					media::metadata::is(vec![media_metadata::age_rating::equals(None)])
				],
				media::series::is(vec![or![
					// If the series has no metadata, then we can allow the media
					series::metadata::is_null(),
					// Or if the series has an age rating and it is under the user age restriction
					series::metadata::is(vec![
						series_metadata::age_rating::not(None),
						series_metadata::age_rating::lte(min_age),
					]),
					// Or if the series has no age rating, then we can allow the media
					series::metadata::is(vec![series_metadata::age_rating::equals(None)])
				]])
			],
			// If the media has an age rating, it must be under the user age restriction
			media::metadata::is(vec![
				media_metadata::age_rating::not(None),
				media_metadata::age_rating::lte(min_age),
			]),
		]
	}
}
