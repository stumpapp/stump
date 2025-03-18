/*
I want to totally revamp the filtering system. I'll maintain the two concepts of "basic" and "smart" filters, but I want
to construct them using the same base structure. I envision:

{
  media(filter: { metadata: { title: { contains: "test" } } }) {
	nodes {
	  name
	  metadata {
		title
	  }
	}
	pageInfo {...}
  }
}

{
  media(
	smartFilter: { _or: [
	  { metadata: { title: { contains: "biz" } } },
	  { metadata: { genre: { contains: "baz" } } }
	] }
) {
	nodes {
	  name
	  metadata {
		title
	  }
	}
	pageInfo {...}
  }
}

I guess an alternative might be allowing both as variants of filter:

pub enum MediaFilter {
	Name { name: String },
}

pub enum Filter<T> {
	And { _and: Vec<T> },
	Or { _or: Vec<T> },
	Not { _not: Vec<T> },
	Basic(HashMap<String, FieldFilter<T>>) // or something, dynamic keys doesn't really work
}

pub enum FieldFilter<T> {
	Equals { eq: T },
	Not { neq: T },
	Any { any: Vec<T> },
	None { none: Vec<T> },
	StringFieldFilter(StringFilter<T>),
	NumericFieldFilter(NumericFilter<T>),
}

So e.g. Filter<MediaFilter> would parse either:

1. { name: { eq: "test" } }
2. { _or: [ { name: { eq: "test" } }, { name: { eq: "test2" } } ] }

This will output a Condition tree to pass to sea-orm, so it can also be merged with access control. For example:

{ _or: [ { name: { eq: "test" } }, { name: { eq: "test2" } } ] } -> age_restrion on user is 12

Condition::all()
	.add(
		Condition::any()
			.add(Condition::all().add(media::Column::Name.eq("test")))
			.add(Condition::all().add(media::Column::Name.eq("test2")))
	) <- This is from the filter
	.add(
		Condition::any()
			.add(...)
			.add(...)
	) <- This is from the access control imposed by Stump
*/

#[generate_smart_filter]
#[derive(Debug, Clone, PartialEq)]
#[serde(untagged)]
#[prisma_table("media")]
pub enum MediaFilter {
	Name { name: String },
	Size { size: i64 },
	Extension { extension: String },
	CreatedAt { created_at: DateTime<FixedOffset> },
	UpdatedAt { updated_at: DateTime<FixedOffset> },
	Status { status: String },
	Path { path: String },
	Pages { pages: i32 },
	// Metadata { metadata: MediaMetadataSmartFilter },
	// Series { series: SeriesSmartFilter },
}

#[derive(Debug, Clone, PartialEq)]
#[serde(untagged)]
/// A filter for a single value, e.g. `name = "test"`
pub enum Filter<T> {
	/// A simple equals filter, e.g. `name = "test"`
	Equals { equals: T },
	/// A simple not filter, e.g. `name != "test"`
	Not { not: T },
	/// A filter for a vector of values, e.g. `name in ["test", "test2"]`
	Any { any: Vec<T> },
	/// A filter for a vector of values, e.g. `name not in ["test", "test2"]`
	None { none: Vec<T> },
	/// A filter for a string value, e.g. `name contains "test"`
	StringFilter(StringFilter<T>),
	/// A filter for a numeric value, e.g. `year > 2000`
	NumericFilter(NumericFilter<T>),
}

#[derive(Debug, Clone, PartialEq)]
#[serde(untagged)]
pub enum StringFilter<T> {
	/// A filter for a string that matches a pattern, e.g. `name like "%test%"`
	Like { like: T },
	/// A filter for a string that contains a substring, e.g. `name contains "test"`. This should
	/// not be confused with an `in` filter. See [`Filter::Any`] for that.
	Contains { contains: T },
	/// A filter for a string that does not contain a substring, e.g. `name excludes "test"`. This
	/// should not be confused with a `not in` filter. See [`Filter::None`] for that.
	Excludes { excludes: T },
	/// A filter for a string that starts with a substring, e.g. `name starts_with "test"`
	StartsWith { starts_with: T },
	/// A filter for a string that ends with a substring, e.g. `name ends_with "test"`
	EndsWith { ends_with: T },
}

#[derive(Debug, Clone, PartialEq)]
pub struct NumericRange<T> {
	pub from: T,
	pub to: T,
	#[serde(default)]
	pub inclusive: bool,
}

#[derive(Debug, Clone, PartialEq)]
#[serde(untagged)]
pub enum NumericFilter<T> {
	Gt { gt: T },
	Gte { gte: T },
	Lt { lt: T },
	Lte { lte: T },
	Range(NumericRange<T>),
}

/// A trait to convert an enum variant into a prisma order parameter
pub trait IntoOrderBy {
	type OrderParam;
	/// Convert the enum variant into a prisma order parameter, e.g. `media::name::order(SortOrder::Asc)`
	fn into_order(self, dir: SortOrder) -> Self::OrderParam;
}

#[derive(Default, Debug, OrderByGen)]
#[prisma(module = "media_metadata")]
pub enum MediaMetadataOrderBy {
	#[default]
	Title,
	Series,
	Number,
	Volume,
	Summary,
	Notes,
	AgeRating,
	Genre,
	Year,
	Month,
	Day,
	Writers,
	Pencillers,
	Inkers,
	Colorists,
	Letterers,
	CoverArtists,
	Editors,
	Publisher,
	Links,
	Characters,
	Teams,
}

#[derive(Default, Debug, OrderByGen)]
#[prisma(module = "media")]
pub enum MediaOrderBy {
	#[default]
	Name,
	Size,
	Extension,
	CreatedAt,
	UpdatedAt,
	Status,
	Path,
	Pages,
	Metadata(Vec<MediaMetadataOrderBy>),
	ModifiedAt,
}

// #[derive(Debug, Deserialize, Serialize)]
// enum SeriesAggregateOrderBy {
// 	Media,
// }

#[derive(Default, Debug, OrderByGen)]
#[prisma(module = "series")]
pub enum SeriesOrderBy {
	#[default]
	Name,
	Description,
	UpdatedAt,
	CreatedAt,
	Path,
	Status,
	// _Count(SeriesAggregateOrderBy),
}

// #[derive(Debug, OrderByGen)]
// #[prisma(module = "library")]
// enum LibraryAggregateOrderBy {
// 	Media,
// 	Series,
// }

#[derive(Default, Debug, OrderByGen)]
#[prisma(module = "library")]
pub enum LibraryOrderBy {
	#[default]
	Name,
	Path,
	Status,
	UpdatedAt,
	CreatedAt,
	// _Count(LibraryAggregateOrderBy),
}

#[derive(Default, Debug, OrderByGen)]
#[prisma(module = "job")]
pub enum JobOrderBy {
	#[default]
	Name,
	Status,
	CreatedAt,
	CompletedAt,
}
