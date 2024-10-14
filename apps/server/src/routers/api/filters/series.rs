use prisma_client_rust::{and, operator, or};
use stump_core::{
	db::entity::User,
	prisma::{
		media::{self},
		media_metadata,
		series::{self, WhereParam},
		series_metadata,
	},
};

use crate::{
	filter::{
		chain_optional_iter, decode_path_filter, SeriesBaseFilter, SeriesFilter,
		SeriesRelationFilter,
	},
	routers::api::filters::{
		apply_library_base_filters, apply_media_base_filters,
		apply_series_metadata_filters, library_not_hidden_from_user_filter,
	},
};

pub(crate) fn apply_series_base_filters(filters: SeriesBaseFilter) -> Vec<WhereParam> {
	chain_optional_iter(
		[],
		[
			(!filters.id.is_empty()).then(|| series::id::in_vec(filters.id)),
			(!filters.name.is_empty()).then(|| series::name::in_vec(filters.name)),
			(!filters.path.is_empty()).then(|| {
				let decoded_paths = decode_path_filter(filters.path);
				series::path::in_vec(decoded_paths)
			}),
			filters.search.map(|s| {
				or![
					series::name::contains(s.clone()),
					series::description::contains(s.clone()),
					series::metadata::is(vec![or![
						series_metadata::title::contains(s.clone()),
						series_metadata::summary::contains(s),
					]])
				]
			}),
			filters
				.metadata
				.map(apply_series_metadata_filters)
				.map(series::metadata::is),
		],
	)
}

pub(crate) fn apply_series_relation_filters(
	filters: SeriesRelationFilter,
) -> Vec<WhereParam> {
	chain_optional_iter(
		[],
		[
			filters
				.library
				.map(apply_library_base_filters)
				.map(series::library::is),
			filters
				.media
				.map(apply_media_base_filters)
				.map(series::media::some),
		],
	)
}

pub(crate) fn apply_series_filters(filters: SeriesFilter) -> Vec<WhereParam> {
	apply_series_base_filters(filters.base_filter)
		.into_iter()
		.chain(apply_series_relation_filters(filters.relation_filter))
		.collect()
}

pub(crate) fn apply_series_library_not_hidden_for_user_filter(
	user: &User,
) -> Vec<WhereParam> {
	vec![series::library::is(vec![
		library_not_hidden_from_user_filter(user),
	])]
}

// TODO: this is wrong
pub(crate) fn apply_series_age_restriction(
	min_age: i32,
	restrict_on_unset: bool,
) -> WhereParam {
	let direct_restriction = series::metadata::is(if restrict_on_unset {
		vec![
			series_metadata::age_rating::not(None),
			series_metadata::age_rating::lte(min_age),
		]
	} else {
		vec![or![
			series_metadata::age_rating::equals(None),
			series_metadata::age_rating::lte(min_age)
		]]
	});

	let media_restriction =
		series::media::some(vec![media::metadata::is(if restrict_on_unset {
			vec![
				media_metadata::age_rating::not(None),
				media_metadata::age_rating::lte(min_age),
			]
		} else {
			vec![or![
				media_metadata::age_rating::equals(None),
				media_metadata::age_rating::lte(min_age)
			]]
		})]);

	or![direct_restriction, media_restriction]
}

// FIXME: hidden libraries introduced a bug here, need to fix!

// fn apply_series_filters_for_user(filters: SeriesFilter, user: &User) -> Vec<WhereParam> {
// 	apply_series_filters(filters)
// 		.into_iter()
// 		.chain(apply_series_library_not_hidden_for_user_filter(user))
// 		.collect()
// }

pub fn apply_series_restrictions_for_user(user: &User) -> Vec<WhereParam> {
	let age_restrictions = user
		.age_restriction
		.as_ref()
		.map(|ar| apply_series_age_restriction(ar.age, ar.restrict_on_unset));

	chain_optional_iter(
		[series::library::is(vec![
			library_not_hidden_from_user_filter(user),
		])],
		[age_restrictions],
	)
}

pub(crate) fn apply_series_filters_for_user(
	filters: SeriesFilter,
	user: &User,
) -> Vec<WhereParam> {
	let age_restrictions = user
		.age_restriction
		.as_ref()
		.map(|ar| apply_series_age_restriction(ar.age, ar.restrict_on_unset));

	let base_filters = operator::and(
		apply_series_filters(filters)
			.into_iter()
			.chain(age_restrictions.map(|ar| vec![ar]).unwrap_or_default())
			.collect::<Vec<WhereParam>>(),
	);

	// TODO: This is not ideal, I am adding an _additional_ relation filter for
	// the library exclusion, when I need to merge any requested filters with this one,
	// instead. This was a regression from the exclusion feature I need to tackle
	vec![and![
		base_filters,
		series::library::is(vec![library_not_hidden_from_user_filter(user)])
	]]
}
