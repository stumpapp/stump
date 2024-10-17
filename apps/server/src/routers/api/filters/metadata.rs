use prisma_client_rust::operator::{and, or};
use stump_core::prisma::{media_metadata, series_metadata};

use crate::{
	filter::{
		chain_optional_iter, MediaMetadataBaseFilter, MediaMetadataFilter,
		MediaMetadataRelationFilter, SeriesMedataFilter, ValueOrRange,
	},
	routers::api::filters::apply_media_filters,
};

pub(crate) fn apply_media_metadata_relation_filters(
	filters: MediaMetadataRelationFilter,
) -> Vec<media_metadata::WhereParam> {
	chain_optional_iter(
		[],
		[filters
			.media
			.map(apply_media_filters)
			.map(media_metadata::media::is)],
	)
}

pub(crate) fn apply_media_metadata_base_filters(
	filters: MediaMetadataBaseFilter,
) -> Vec<media_metadata::WhereParam> {
	chain_optional_iter(
		[],
		[
			(!filters.genre.is_empty()).then(|| {
				// A few list fields are stored as a string right now. This isn't ideal, but the workaround
				// for filtering has to be to have OR'd contains queries for each genre in
				// the list.
				or(list_str_to_params(
					filters.genre.into_iter(),
					media_metadata::genre::contains,
				))
			}),
			(!filters.character.is_empty()).then(|| {
				or(list_str_to_params(
					filters.character.into_iter(),
					media_metadata::characters::contains,
				))
			}),
			(!filters.colorist.is_empty()).then(|| {
				or(list_str_to_params(
					filters.colorist.into_iter(),
					media_metadata::colorists::contains,
				))
			}),
			(!filters.writer.is_empty()).then(|| {
				or(list_str_to_params(
					filters.writer.into_iter(),
					media_metadata::writers::contains,
				))
			}),
			(!filters.penciller.is_empty()).then(|| {
				or(list_str_to_params(
					filters.penciller.into_iter(),
					media_metadata::pencillers::contains,
				))
			}),
			(!filters.inker.is_empty()).then(|| {
				or(list_str_to_params(
					filters.inker.into_iter(),
					media_metadata::inkers::contains,
				))
			}),
			(!filters.editor.is_empty()).then(|| {
				or(list_str_to_params(
					filters.editor.into_iter(),
					media_metadata::editors::contains,
				))
			}),
			(!filters.publisher.is_empty())
				.then(|| media_metadata::publisher::in_vec(filters.publisher)),
			filters.year.map(|v| match v {
				ValueOrRange::Value(v) => media_metadata::year::equals(Some(v)),
				ValueOrRange::Range(range) => and(range
					.into_prisma(media_metadata::year::gte, media_metadata::year::lte)),
			}),
			filters.age_rating.map(media_metadata::age_rating::lte),
		],
	)
}

pub(crate) fn apply_media_metadata_filters(
	filters: MediaMetadataFilter,
) -> Vec<media_metadata::WhereParam> {
	apply_media_metadata_base_filters(filters.base_filter)
		.into_iter()
		.chain(apply_media_metadata_relation_filters(
			filters.relation_filter,
		))
		.collect()
}

pub(crate) fn apply_series_metadata_filters(
	filters: SeriesMedataFilter,
) -> Vec<series_metadata::WhereParam> {
	chain_optional_iter(
		[],
		[
			(!filters.meta_type.is_empty())
				.then(|| series_metadata::meta_type::in_vec(filters.meta_type)),
			(!filters.publisher.is_empty())
				.then(|| series_metadata::publisher::in_vec(filters.publisher)),
			(!filters.status.is_empty())
				.then(|| series_metadata::status::in_vec(filters.status)),
			filters.volume.map(|v| match v {
				ValueOrRange::Value(v) => series_metadata::volume::equals(Some(v)),
				ValueOrRange::Range(range) => and(range.into_prisma(
					series_metadata::volume::gte,
					series_metadata::volume::lte,
				)),
			}),
			filters.age_rating.map(series_metadata::age_rating::lte),
		],
	)
}

fn list_str_to_params<R: From<prisma_client_rust::Operator<R>>>(
	iter: impl Iterator<Item = String>,
	op: impl Fn(String) -> R,
) -> Vec<R> {
	iter.into_iter().map(op).collect::<Vec<_>>()
}
