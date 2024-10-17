use prisma_client_rust::{
	and,
	operator::{self, or},
	or,
};
use stump_core::{
	db::{entity::User, query::pagination::Pagination},
	prisma::{
		active_reading_session, finished_reading_session,
		media::{self, WhereParam},
		media_metadata, series, series_metadata, tag,
	},
};

use crate::{
	filter::{
		chain_optional_iter, decode_path_filter, MediaBaseFilter, MediaFilter,
		MediaRelationFilter, ReadStatus,
	},
	routers::api::filters::{
		apply_media_metadata_base_filters, apply_series_filters,
		library_not_hidden_from_user_filter,
	},
};

pub(crate) fn apply_media_read_status_filter(
	user_id: String,
	read_status: Vec<ReadStatus>,
) -> Vec<WhereParam> {
	chain_optional_iter(
		[],
		[(!read_status.is_empty()).then(|| {
			or(read_status
				.into_iter()
				.map(|rs| match rs {
					ReadStatus::Reading => {
						media::active_user_reading_sessions::some(vec![and![
							active_reading_session::user_id::equals(user_id.clone()),
						]])
					},
					ReadStatus::Completed => {
						media::finished_user_reading_sessions::some(vec![and![
							finished_reading_session::user_id::equals(user_id.clone()),
						]])
					},
					ReadStatus::Unread => {
						and![
							media::active_user_reading_sessions::none(vec![
								active_reading_session::user_id::equals(user_id.clone()),
							]),
							media::finished_user_reading_sessions::none(vec![
								finished_reading_session::user_id::equals(
									user_id.clone()
								),
							])
						]
					},
				})
				.collect())
		})],
	)
}

pub(crate) fn apply_media_base_filters(filters: MediaBaseFilter) -> Vec<WhereParam> {
	chain_optional_iter(
		[],
		[
			(!filters.id.is_empty()).then(|| media::id::in_vec(filters.id)),
			(!filters.name.is_empty()).then(|| media::name::in_vec(filters.name)),
			(!filters.extension.is_empty())
				.then(|| media::extension::in_vec(filters.extension)),
			(!filters.path.is_empty()).then(|| {
				let decoded_paths = decode_path_filter(filters.path);
				media::path::in_vec(decoded_paths)
			}),
			(!filters.tags.is_empty())
				.then(|| media::tags::some(vec![tag::name::in_vec(filters.tags)])),
			filters.search.map(|s| {
				or![
					media::name::contains(s.clone()),
					media::metadata::is(vec![or![
						media_metadata::title::contains(s.clone()),
						media_metadata::summary::contains(s),
					]])
				]
			}),
			filters
				.metadata
				.map(apply_media_metadata_base_filters)
				.map(media::metadata::is),
		],
	)
}

pub(crate) fn apply_media_relation_filters(
	filters: MediaRelationFilter,
) -> Vec<WhereParam> {
	chain_optional_iter(
		[],
		[filters
			.series
			.map(apply_series_filters)
			.map(media::series::is)],
	)
}

pub(crate) fn apply_media_filters(filters: MediaFilter) -> Vec<WhereParam> {
	apply_media_base_filters(filters.base_filter)
		.into_iter()
		.chain(apply_media_relation_filters(filters.relation_filter))
		.collect()
}

pub(crate) fn apply_media_library_not_hidden_for_user_filter(
	user: &User,
) -> Vec<WhereParam> {
	vec![media::series::is(vec![series::library::is(vec![
		library_not_hidden_from_user_filter(user),
	])])]
}

pub(crate) fn apply_media_filters_for_user(
	filters: MediaFilter,
	user: &User,
) -> Vec<WhereParam> {
	let user_id = user.id.clone();
	let age_restrictions = user
		.age_restriction
		.as_ref()
		.map(|ar| apply_media_age_restriction(ar.age, ar.restrict_on_unset));

	let read_status_filters = filters.base_filter.read_status.clone();
	let base_filters = operator::and(
		apply_media_filters(filters)
			.into_iter()
			.chain(age_restrictions.map(|ar| vec![ar]).unwrap_or_default())
			.chain(apply_media_read_status_filter(user_id, read_status_filters))
			.collect::<Vec<WhereParam>>(),
	);

	// TODO: This is not ideal, I am adding an _additional_ relation filter for
	// the library exclusion, when I need to merge any requested filters with this one,
	// instead. This was a regression from the exclusion feature I need to tackle
	vec![and![
		base_filters,
		media::series::is(vec![series::library::is(vec![
			library_not_hidden_from_user_filter(user),
		])])
	]]
}

pub(crate) fn apply_media_pagination<'a>(
	query: media::FindManyQuery<'a>,
	pagination: &Pagination,
) -> media::FindManyQuery<'a> {
	match pagination {
		Pagination::Page(page_query) => {
			let (skip, take) = page_query.get_skip_take();
			query.skip(skip).take(take)
		},
		Pagination::Cursor(cursor_params) => {
			let mut cursor_query = query;
			if let Some(cursor) = cursor_params.cursor.as_deref() {
				cursor_query = cursor_query
					.cursor(media::id::equals(cursor.to_string()))
					.skip(1);
			}
			if let Some(limit) = cursor_params.limit {
				cursor_query = cursor_query.take(limit);
			}
			cursor_query
		},
		_ => query,
	}
}

/// Generates a single where condition for a media progress query to enforce media which
/// is currently in progress
pub(crate) fn apply_in_progress_filter_for_user(
	user_id: String,
) -> active_reading_session::WhereParam {
	and![
		active_reading_session::user_id::equals(user_id),
		or![
			active_reading_session::page::gt(0),
			active_reading_session::epubcfi::not(None),
		]
	]
}

/// Generates a condition to enforce age restrictions on media and their corresponding
/// series.
pub(crate) fn apply_media_age_restriction(
	min_age: i32,
	restrict_on_unset: bool,
) -> WhereParam {
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

pub fn apply_media_restrictions_for_user(user: &User) -> Vec<WhereParam> {
	let age_restrictions = user
		.age_restriction
		.as_ref()
		.map(|ar| apply_media_age_restriction(ar.age, ar.restrict_on_unset));

	chain_optional_iter(
		[media::series::is(vec![series::library::is(vec![
			library_not_hidden_from_user_filter(user),
		])])],
		[age_restrictions],
	)
}
