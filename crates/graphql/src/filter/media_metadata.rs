use async_graphql::InputObject;
use models::entity::media_metadata;

use super::{
	apply_numeric_filter, apply_string_filter, IntoFilter, NumericFilter,
	StringLikeFilter,
};

#[derive(InputObject, Clone)]
pub struct MediaMetadataFilterInput {
	#[graphql(default)]
	pub title: Option<StringLikeFilter<String>>,
	#[graphql(default)]
	pub publisher: Option<StringLikeFilter<String>>,
	#[graphql(default)]
	pub genre: Option<StringLikeFilter<String>>,
	#[graphql(default)]
	pub characters: Option<StringLikeFilter<String>>,
	#[graphql(default)]
	pub colorists: Option<StringLikeFilter<String>>,
	#[graphql(default)]
	pub writers: Option<StringLikeFilter<String>>,
	#[graphql(default)]
	pub pencillers: Option<StringLikeFilter<String>>,
	#[graphql(default)]
	pub letterers: Option<StringLikeFilter<String>>,
	#[graphql(default)]
	pub cover_artists: Option<StringLikeFilter<String>>,
	#[graphql(default)]
	pub inkers: Option<StringLikeFilter<String>>,
	#[graphql(default)]
	pub editors: Option<StringLikeFilter<String>>,
	#[graphql(default)]
	pub age_rating: Option<NumericFilter<i32>>,
	#[graphql(default)]
	pub year: Option<NumericFilter<i32>>,
	#[graphql(default)]
	pub month: Option<NumericFilter<i32>>,
	#[graphql(default)]
	pub day: Option<NumericFilter<i32>>,
	#[graphql(default)]
	pub links: Option<StringLikeFilter<String>>,
	#[graphql(default)]
	pub teams: Option<StringLikeFilter<String>>,
	#[graphql(default)]
	pub summary: Option<StringLikeFilter<String>>,
	#[graphql(default)]
	pub series: Option<NumericFilter<i32>>,

	#[graphql(name = "_and", default)]
	pub _and: Option<Vec<MediaMetadataFilterInput>>,
	#[graphql(name = "_not", default)]
	pub _not: Option<Vec<MediaMetadataFilterInput>>,
	#[graphql(name = "_or", default)]
	pub _or: Option<Vec<MediaMetadataFilterInput>>,
}

impl IntoFilter for MediaMetadataFilterInput {
	fn into_filter(self) -> sea_orm::Condition {
		sea_orm::Condition::all()
			.add_option(self._and.map(|f| {
				let mut and_condition = sea_orm::Condition::all();
				for filter in f {
					and_condition = and_condition.add(filter.into_filter());
				}
				and_condition
			}))
			.add_option(self._not.map(|f| {
				let mut not_condition = sea_orm::Condition::any();
				for filter in f {
					not_condition = not_condition.add(filter.into_filter());
				}
				not_condition.not()
			}))
			.add_option(self._or.map(|f| {
				let mut or_condition = sea_orm::Condition::any();
				for filter in f {
					or_condition = or_condition.add(filter.into_filter());
				}
				or_condition
			}))
			.add_option(
				self.title
					.map(|f| apply_string_filter(media_metadata::Column::Title, f)),
			)
			.add_option(
				self.publisher
					.map(|f| apply_string_filter(media_metadata::Column::Publisher, f)),
			)
			.add_option(
				self.genre
					.map(|f| apply_string_filter(media_metadata::Column::Genre, f)),
			)
			.add_option(
				self.characters
					.map(|f| apply_string_filter(media_metadata::Column::Characters, f)),
			)
			.add_option(
				self.colorists
					.map(|f| apply_string_filter(media_metadata::Column::Colorists, f)),
			)
			.add_option(
				self.writers
					.map(|f| apply_string_filter(media_metadata::Column::Writers, f)),
			)
			.add_option(
				self.pencillers
					.map(|f| apply_string_filter(media_metadata::Column::Pencillers, f)),
			)
			.add_option(
				self.letterers
					.map(|f| apply_string_filter(media_metadata::Column::Letterers, f)),
			)
			.add_option(
				self.cover_artists.map(|f| {
					apply_string_filter(media_metadata::Column::CoverArtists, f)
				}),
			)
			.add_option(
				self.inkers
					.map(|f| apply_string_filter(media_metadata::Column::Inkers, f)),
			)
			.add_option(
				self.editors
					.map(|f| apply_string_filter(media_metadata::Column::Editors, f)),
			)
			.add_option(
				self.age_rating
					.map(|f| apply_numeric_filter(media_metadata::Column::AgeRating, f)),
			)
			.add_option(
				self.year
					.map(|f| apply_numeric_filter(media_metadata::Column::Year, f)),
			)
			.add_option(
				self.month
					.map(|f| apply_numeric_filter(media_metadata::Column::Month, f)),
			)
			.add_option(
				self.day
					.map(|f| apply_numeric_filter(media_metadata::Column::Day, f)),
			)
			.add_option(
				self.links
					.map(|f| apply_string_filter(media_metadata::Column::Links, f)),
			)
			.add_option(
				self.teams
					.map(|f| apply_string_filter(media_metadata::Column::Teams, f)),
			)
			.add_option(
				self.summary
					.map(|f| apply_string_filter(media_metadata::Column::Summary, f)),
			)
			.add_option(
				self.series
					.map(|f| apply_numeric_filter(media_metadata::Column::Series, f)),
			)
	}
}
