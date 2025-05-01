use async_graphql::{InputObject, InputType, OneofObject};
use models::{
	entity::{finished_reading_session, media, media_metadata, reading_session},
	shared::enums::{FileStatus, ReadingStatus},
};
use sea_orm::{
	prelude::{DateTimeWithTimeZone, *},
	sea_query::{ConditionExpression, ExprTrait},
	Value,
};

use super::IntoFilter;

#[derive(OneofObject, Clone)]
#[graphql(concrete(name = "FieldFilterString", params(String)))]
#[graphql(concrete(name = "FieldFilterFileStatus", params(FileStatus)))]
pub enum StringLikeFilter<T>
where
	T: InputType,
{
	Eq(T),
	Neq(T),
	AnyOf(Vec<T>),
	NoneOf(Vec<T>),
	Like(T),
	Contains(T),
	Excludes(T),
	StartsWith(T),
	EndsWith(T),
}

fn apply_string_filter<C, T>(
	column: C,
	filter: StringLikeFilter<T>,
) -> impl Into<ConditionExpression>
where
	C: sea_orm::ColumnTrait,
	T: InputType + Into<Value> + Into<String>,
{
	match filter {
		StringLikeFilter::Eq(value) => column.eq(value),
		StringLikeFilter::Neq(value) => column.ne(value),
		StringLikeFilter::AnyOf(values) => column.is_in(values),
		StringLikeFilter::NoneOf(values) => column.is_not_in(values),
		StringLikeFilter::Like(value) => column.like(value),
		StringLikeFilter::Contains(value) => column.contains(value),
		StringLikeFilter::Excludes(value) => column.not_like(value),
		StringLikeFilter::StartsWith(value) => column.starts_with(value),
		StringLikeFilter::EndsWith(value) => column.ends_with(value),
	}
}

#[derive(InputObject, Clone)]
#[graphql(concrete(name = "NumericRangeF32", params(f32)))]
#[graphql(concrete(name = "NumericRangeI32", params(i32)))]
#[graphql(concrete(name = "NumericRangeI64", params(i64)))]
#[graphql(concrete(name = "NumericRangeU32", params(u32)))]
#[graphql(concrete(name = "NumericRangeU64", params(u64)))]
#[graphql(concrete(name = "NumericRangeDateTime", params(DateTimeWithTimeZone)))]
pub struct NumericRange<T>
where
	T: InputType,
{
	pub from: T,
	pub to: T,
	pub inclusive: bool,
}

#[derive(OneofObject, Clone)]
#[graphql(concrete(name = "NumericFilterF32", params(f32)))]
#[graphql(concrete(name = "NumericFilterI32", params(i32)))]
#[graphql(concrete(name = "NumericFilterI64", params(i64)))]
#[graphql(concrete(name = "NumericFilterU32", params(u32)))]
#[graphql(concrete(name = "NumericFilterU64", params(u64)))]
#[graphql(concrete(name = "NumericFilterDateTime", params(DateTimeWithTimeZone)))]
pub enum NumericFilter<T>
where
	T: InputType,
	NumericRange<T>: InputType,
{
	Eq(T),
	Neq(T),
	AnyOf(Vec<T>),
	NoneOf(Vec<T>),
	Gt(T),
	Gte(T),
	Lt(T),
	Lte(T),
	Range(NumericRange<T>),
}

fn apply_numeric_filter<C, T>(
	column: C,
	filter: NumericFilter<T>,
) -> impl Into<ConditionExpression>
where
	C: sea_orm::ColumnTrait,
	T: InputType + Into<Value>,
	NumericRange<T>: InputType,
{
	match filter {
		NumericFilter::Eq(value) => column.eq(value),
		NumericFilter::Neq(value) => column.ne(value),
		NumericFilter::AnyOf(values) => column.is_in(values),
		NumericFilter::NoneOf(values) => column.is_not_in(values),
		NumericFilter::Gt(value) => column.gt(value),
		NumericFilter::Gte(value) => column.gte(value),
		NumericFilter::Lt(value) => column.lt(value),
		NumericFilter::Lte(value) => column.lte(value),
		NumericFilter::Range(range) => {
			if range.inclusive {
				column.gte(range.from).and(column.lte(range.to))
			} else {
				column.gt(range.from).and(column.lt(range.to))
			}
		},
	}
}

#[derive(OneofObject, Clone)]
#[graphql(concrete(name = "ComputedFilterReadingStatus", params(ReadingStatus)))]
pub enum ConceptualFilter<T>
where
	T: InputType,
{
	Is(T),
	IsNot(T),
}

// TODO: Probably not correct....
fn apply_reading_status_filter(
	value: ReadingStatus,
	not: bool,
) -> impl Into<ConditionExpression> {
	let base_filter = match value {
		ReadingStatus::Reading => reading_session::Column::Id.is_not_null(),
		ReadingStatus::Finished => finished_reading_session::Column::Id.is_null(),
		// TODO: add a field to reading_session for marking DNF
		ReadingStatus::Abandoned => unimplemented!("Abandoned filter not implemented"),
		ReadingStatus::NotStarted => reading_session::Column::Id
			.is_null()
			.and(finished_reading_session::Column::Id.is_null()),
	};

	if not {
		base_filter.not()
	} else {
		base_filter
	}
}

#[derive(InputObject, Clone)]
pub struct MediaFilterInputNext {
	#[graphql(default)]
	pub name: Option<StringLikeFilter<String>>,
	#[graphql(default)]
	pub size: Option<NumericFilter<i64>>,
	#[graphql(default)]
	pub extension: Option<StringLikeFilter<String>>,
	#[graphql(default)]
	pub created_at: Option<NumericFilter<DateTimeWithTimeZone>>,
	#[graphql(default)]
	pub updated_at: Option<NumericFilter<DateTimeWithTimeZone>>,
	#[graphql(default)]
	pub series_id: Option<StringLikeFilter<String>>,
	#[graphql(default)]
	pub status: Option<StringLikeFilter<FileStatus>>,
	#[graphql(default)]
	pub path: Option<StringLikeFilter<String>>,
	#[graphql(default)]
	pub pages: Option<NumericFilter<i32>>,

	#[graphql(default)]
	pub reading_status: Option<ConceptualFilter<ReadingStatus>>,

	#[graphql(default)]
	pub metadata: Option<MediaMetadataFilterInputNext>,

	#[graphql(name = "_and", default)]
	pub _and: Option<Vec<MediaFilterInputNext>>,
	#[graphql(name = "_not", default)]
	pub _not: Option<Vec<MediaFilterInputNext>>,
	#[graphql(name = "_or", default)]
	pub _or: Option<Vec<MediaFilterInputNext>>,
}

impl IntoFilter for MediaFilterInputNext {
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
				self.name
					.map(|f| apply_string_filter(media::Column::Name, f)),
			)
			.add_option(
				self.size
					.map(|f| apply_numeric_filter(media::Column::Size, f)),
			)
			.add_option(
				self.extension
					.map(|f| apply_string_filter(media::Column::Extension, f)),
			)
			.add_option(
				self.created_at
					.map(|f| apply_numeric_filter(media::Column::CreatedAt, f)),
			)
			.add_option(
				self.updated_at
					.map(|f| apply_numeric_filter(media::Column::UpdatedAt, f)),
			)
			.add_option(
				self.series_id
					.map(|f| apply_string_filter(media::Column::SeriesId, f)),
			)
			.add_option(
				self.status
					.map(|f| apply_string_filter(media::Column::Status, f)),
			)
			.add_option(
				self.path
					.map(|f| apply_string_filter(media::Column::Path, f)),
			)
			.add_option(
				self.pages
					.map(|f| apply_numeric_filter(media::Column::Pages, f)),
			)
			.add_option(self.reading_status.map(|f| match f {
				ConceptualFilter::Is(value) => apply_reading_status_filter(value, false),
				ConceptualFilter::IsNot(value) => {
					apply_reading_status_filter(value, true)
				},
			}))
			.add_option(self.metadata.map(|f| f.into_filter()))
	}
}

#[derive(InputObject, Clone)]
pub struct MediaMetadataFilterInputNext {
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
	pub _and: Option<Vec<MediaMetadataFilterInputNext>>,
	#[graphql(name = "_not", default)]
	pub _not: Option<Vec<MediaMetadataFilterInputNext>>,
	#[graphql(name = "_or", default)]
	pub _or: Option<Vec<MediaMetadataFilterInputNext>>,
}

impl IntoFilter for MediaMetadataFilterInputNext {
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
