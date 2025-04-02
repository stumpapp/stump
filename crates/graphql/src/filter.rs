use filter_gen::IntoFilter;
use sea_orm::prelude::*;
use serde::{Deserialize, Serialize};
use serde_with::skip_serializing_none;

// TODO: This probably needs a rewrite to make it more compatible with async-graphql. The big issue is generics
// with input objects. Look at and yoink from seaography for how they are doing things

// Note: See https://github.com/serde-rs/json/issues/501

// NOTE: I originally went for IntoCondition, but that is a trait for sea-query and
// I wanted to avoid conflicts in the naming
pub trait IntoFilter {
	fn into_filter(self) -> sea_orm::Condition;
}

// TODO: Support is_null and is_not_null
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(untagged)]
pub enum FieldFilter<T> {
	Equals { eq: T },
	Not { neq: T },
	Any { any: Vec<T> },
	None { none: Vec<T> },
	StringFieldFilter(StringFilter<T>),
	NumericFieldFilter(NumericFilter<T>),
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(untagged)]
pub enum StringFilter<T> {
	Like {
		like: T,
	},
	Contains {
		contains: T,
	},
	Excludes {
		excludes: T,
	},
	#[serde(rename_all = "camelCase")]
	StartsWith {
		starts_with: T,
	},
	#[serde(rename_all = "camelCase")]
	EndsWith {
		ends_with: T,
	},
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(untagged)]
pub enum NumericFilter<T> {
	Gt { gt: T },
	Gte { gte: T },
	Lt { lt: T },
	Lte { lte: T },
	Range(NumericRange<T>),
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NumericRange<T> {
	pub from: T,
	pub to: T,
	pub inclusive: bool,
}

#[skip_serializing_none]
#[derive(Debug, Clone, Default, Serialize, Deserialize, IntoFilter)]
#[serde(rename_all = "camelCase")]
pub struct MediaFilterInput {
	#[field_column("models::entity::media::Column::Name")]
	pub name: Option<FieldFilter<String>>,
	#[field_column("models::entity::media::Column::Size")]
	pub size: Option<FieldFilter<i64>>,
	#[field_column("models::entity::media::Column::Extension")]
	pub extension: Option<FieldFilter<String>>,
	#[field_column("models::entity::media::Column::CreatedAt")]
	pub created_at: Option<FieldFilter<DateTimeWithTimeZone>>,
	#[field_column("models::entity::media::Column::UpdatedAt")]
	pub updated_at: Option<FieldFilter<DateTimeWithTimeZone>>,
	#[field_column("models::entity::media::Column::Status")]
	pub status: Option<FieldFilter<String>>,
	#[field_column("models::entity::media::Column::Path")]
	pub path: Option<FieldFilter<String>>,
	#[field_column("models::entity::media::Column::Pages")]
	pub pages: Option<FieldFilter<i32>>,

	#[nested_filter]
	pub metadata: Option<MediaMetadataFilterInput>,

	pub _and: Option<Vec<MediaFilterInput>>,
	pub _not: Option<Vec<MediaFilterInput>>,
	pub _or: Option<Vec<MediaFilterInput>>,
}

// #[is_optional]
// 	Publisher { publisher: String },
// 	#[is_optional]
// 	Genre { genre: String },
// 	#[is_optional]
// 	Characters { characters: String },
// 	#[is_optional]
// 	Colorists { colorists: String },
// 	#[is_optional]
// 	Writers { writers: String },
// 	#[is_optional]
// 	Pencillers { pencillers: String },
// 	#[is_optional]
// 	Letterers { letterers: String },
// 	#[is_optional]
// 	Inkers { inkers: String },
// 	#[is_optional]
// 	Editors { editors: String },
// 	#[is_optional]
// 	AgeRating { age_rating: i32 },
// 	#[is_optional]
// 	Year { year: i32 },
// 	#[is_optional]
// 	Month { month: i32 },
// 	#[is_optional]
// 	Day { day: i32 },

#[skip_serializing_none]
#[derive(Debug, Clone, Default, Serialize, Deserialize, IntoFilter)]
#[serde(rename_all = "camelCase")]
pub struct MediaMetadataFilterInput {
	#[field_column("models::entity::media_metadata::Column::Title")]
	pub title: Option<FieldFilter<String>>,
	#[field_column("models::entity::media_metadata::Column::Publisher")]
	pub publisher: Option<FieldFilter<String>>,
	#[field_column("models::entity::media_metadata::Column::Genre")]
	pub genre: Option<FieldFilter<String>>,
	#[field_column("models::entity::media_metadata::Column::Characters")]
	pub characters: Option<FieldFilter<String>>,
	#[field_column("models::entity::media_metadata::Column::Colorists")]
	pub colorists: Option<FieldFilter<String>>,
	#[field_column("models::entity::media_metadata::Column::Writers")]
	pub writers: Option<FieldFilter<String>>,
	#[field_column("models::entity::media_metadata::Column::Pencillers")]
	pub pencillers: Option<FieldFilter<String>>,
	#[field_column("models::entity::media_metadata::Column::Letterers")]
	pub letterers: Option<FieldFilter<String>>,
	#[field_column("models::entity::media_metadata::Column::CoverArtists")]
	pub cover_artists: Option<FieldFilter<String>>,
	#[field_column("models::entity::media_metadata::Column::Inkers")]
	pub inkers: Option<FieldFilter<String>>,
	#[field_column("models::entity::media_metadata::Column::Editors")]
	pub editors: Option<FieldFilter<String>>,
	#[field_column("models::entity::media_metadata::Column::AgeRating")]
	pub age_rating: Option<FieldFilter<i32>>,
	#[field_column("models::entity::media_metadata::Column::Year")]
	pub year: Option<FieldFilter<i32>>,
	#[field_column("models::entity::media_metadata::Column::Month")]
	pub month: Option<FieldFilter<i32>>,
	#[field_column("models::entity::media_metadata::Column::Day")]
	pub day: Option<FieldFilter<i32>>,
	#[field_column("models::entity::media_metadata::Column::Links")]
	pub links: Option<FieldFilter<String>>,
	#[field_column("models::entity::media_metadata::Column::Teams")]
	pub teams: Option<FieldFilter<String>>,
	#[field_column("models::entity::media_metadata::Column::Summary")]
	pub summary: Option<FieldFilter<String>>,
	#[field_column("models::entity::media_metadata::Column::Series")]
	pub series: Option<FieldFilter<String>>,

	pub _and: Option<Vec<MediaMetadataFilterInput>>,
	pub _not: Option<Vec<MediaMetadataFilterInput>>,
	pub _or: Option<Vec<MediaMetadataFilterInput>>,
}

// pub fn filter_inputs() -> Vec<dynamic::InputObject> {
// 	let mut inputs = vec![];

// 	let media_filter_input =
// 		dynamic::InputObject::new("MediaMetadataFilterInput".to_string());

// 	inputs.push(media_filter_input);

// 	inputs
// }

#[cfg(test)]
mod tests {
	use super::*;
	use models::entity::*;

	#[test]
	fn test_serialize_media_filter() {
		let filter = MediaFilterInput {
			name: Some(FieldFilter::Equals {
				eq: "test".to_string(),
			}),
			..Default::default()
		};

		let serialized = serde_json::to_string(&filter).unwrap();
		assert_eq!(serialized, r#"{"name":{"eq":"test"}}"#);
	}

	#[test]
	fn test_serialize_media_filter_with_metadata() {
		let filter = MediaFilterInput {
			name: Some(FieldFilter::Equals {
				eq: "test".to_string(),
			}),
			metadata: Some(MediaMetadataFilterInput {
				title: Some(FieldFilter::Equals {
					eq: "test".to_string(),
				}),
				series: Some(FieldFilter::Equals {
					eq: "theseries".to_string(),
				}),
				..Default::default()
			}),
			..Default::default()
		};

		let serialized = serde_json::to_string(&filter).unwrap();
		assert_eq!(
			serialized,
			r#"{"name":{"eq":"test"},"metadata":{"title":{"eq":"test"},"series":{"eq":"theseries"}}}"#
		);
	}

	#[test]
	fn test_serialize_media_filter_with_and() {
		let filter = MediaFilterInput {
			_and: Some(vec![
				MediaFilterInput {
					name: Some(FieldFilter::Equals {
						eq: "test".to_string(),
					}),
					..Default::default()
				},
				MediaFilterInput {
					name: Some(FieldFilter::Equals {
						eq: "test2".to_string(),
					}),
					..Default::default()
				},
			]),
			..Default::default()
		};

		let serialized = serde_json::to_string(&filter).unwrap();
		assert_eq!(
			serialized,
			r#"{"_and":[{"name":{"eq":"test"}},{"name":{"eq":"test2"}}]}"#
		);
	}

	#[test]
	fn test_serialize_media_filter_with_metadata_with_ands() {
		let filter = MediaFilterInput {
			name: Some(FieldFilter::Equals {
				eq: "test".to_string(),
			}),
			metadata: Some(MediaMetadataFilterInput {
				_and: Some(vec![
					MediaMetadataFilterInput {
						title: Some(FieldFilter::Equals {
							eq: "test".to_string(),
						}),
						..Default::default()
					},
					MediaMetadataFilterInput {
						series: Some(FieldFilter::Equals {
							eq: "theseries".to_string(),
						}),
						..Default::default()
					},
				]),
				..Default::default()
			}),
			..Default::default()
		};

		let serialized = serde_json::to_string(&filter).unwrap();
		assert_eq!(
			serialized,
			r#"{"name":{"eq":"test"},"metadata":{"_and":[{"title":{"eq":"test"}},{"series":{"eq":"theseries"}}]}}"#
		);
	}

	#[test]
	fn test_basic_into_filter() {
		let condition = MediaFilterInput {
			name: Some(FieldFilter::Equals {
				eq: "test".to_string(),
			}),
			..Default::default()
		}
		.into_filter();
		assert_eq!(
			condition,
			sea_orm::Condition::all().add(media::Column::Name.eq("test"))
		);

		let condition = MediaFilterInput {
			name: Some(FieldFilter::Not {
				neq: "test".to_string(),
			}),
			..Default::default()
		}
		.into_filter();
		assert_eq!(
			condition,
			sea_orm::Condition::all().add(media::Column::Name.ne("test"))
		);

		let condition = MediaFilterInput {
			name: Some(FieldFilter::Any {
				any: vec!["test".to_string(), "test2".to_string()],
			}),
			..Default::default()
		}
		.into_filter();
		assert_eq!(
			condition,
			sea_orm::Condition::all()
				.add(media::Column::Name.is_in(vec!["test", "test2"]))
		);

		let condition = MediaFilterInput {
			name: Some(FieldFilter::None {
				none: vec!["test".to_string(), "test2".to_string()],
			}),
			..Default::default()
		}
		.into_filter();
		assert_eq!(
			condition,
			sea_orm::Condition::all()
				.add(media::Column::Name.is_not_in(vec!["test", "test2"]))
		);

		let condition = MediaFilterInput {
			name: Some(FieldFilter::StringFieldFilter(StringFilter::Like {
				like: "test".to_string(),
			})),
			..Default::default()
		}
		.into_filter();
		assert_eq!(
			condition,
			sea_orm::Condition::all()
				.add(media::Column::Name.like(format!("%{}%", "test")))
		);

		let condition = MediaFilterInput {
			name: Some(FieldFilter::StringFieldFilter(StringFilter::Contains {
				contains: "test".to_string(),
			})),
			..Default::default()
		}
		.into_filter();
		assert_eq!(
			condition,
			sea_orm::Condition::all().add(media::Column::Name.contains("test"))
		);

		let condition = MediaFilterInput {
			name: Some(FieldFilter::StringFieldFilter(StringFilter::Excludes {
				excludes: "test".to_string(),
			})),
			..Default::default()
		}
		.into_filter();
		assert_eq!(
			condition,
			sea_orm::Condition::all()
				.add(media::Column::Name.not_like(format!("%{}%", "test")))
		);
	}

	#[test]
	fn test_grouped_into_filter() {
		// _and
		let condition = MediaFilterInput {
			_and: Some(vec![
				MediaFilterInput {
					name: Some(FieldFilter::Equals {
						eq: "test".to_string(),
					}),
					..Default::default()
				},
				MediaFilterInput {
					name: Some(FieldFilter::Equals {
						eq: "test2".to_string(),
					}),
					..Default::default()
				},
			]),
			..Default::default()
		}
		.into_filter();
		assert_eq!(
			condition,
			sea_orm::Condition::all().add(
				sea_orm::Condition::all()
					.add(media::Column::Name.eq("test"))
					.add(media::Column::Name.eq("test2"))
			)
		);

		// _or
		let condition = MediaFilterInput {
			_or: Some(vec![
				MediaFilterInput {
					name: Some(FieldFilter::Equals {
						eq: "test".to_string(),
					}),
					..Default::default()
				},
				MediaFilterInput {
					name: Some(FieldFilter::Equals {
						eq: "test2".to_string(),
					}),
					..Default::default()
				},
			]),
			..Default::default()
		}
		.into_filter();
		assert_eq!(
			condition,
			sea_orm::Condition::all().add(
				sea_orm::Condition::any()
					.add(media::Column::Name.eq("test"))
					.add(media::Column::Name.eq("test2"))
			)
		);

		// _not
		let condition = MediaFilterInput {
			_not: Some(vec![
				MediaFilterInput {
					name: Some(FieldFilter::Equals {
						eq: "test".to_string(),
					}),
					..Default::default()
				},
				MediaFilterInput {
					name: Some(FieldFilter::Equals {
						eq: "test2".to_string(),
					}),
					..Default::default()
				},
			]),
			..Default::default()
		}
		.into_filter();
		assert_eq!(
			condition,
			sea_orm::Condition::all().add(
				sea_orm::Condition::any()
					.add(media::Column::Name.eq("test"))
					.add(media::Column::Name.eq("test2"))
					.not()
			)
		);
	}

	#[test]
	fn test_nested_into_filter() {
		let condition = MediaFilterInput {
			name: Some(FieldFilter::Equals {
				eq: "test".to_string(),
			}),
			metadata: Some(MediaMetadataFilterInput {
				title: Some(FieldFilter::Equals {
					eq: "test".to_string(),
				}),
				series: Some(FieldFilter::Equals {
					eq: "theseries".to_string(),
				}),
				..Default::default()
			}),
			..Default::default()
		}
		.into_filter();
		assert_eq!(
			condition,
			sea_orm::Condition::all()
				.add(media::Column::Name.eq("test"))
				.add(
					sea_orm::Condition::all()
						.add(media_metadata::Column::Title.eq("test"))
						.add(media_metadata::Column::Series.eq("theseries"))
				)
		);
	}
}

// /// A trait to convert an enum variant into a prisma order parameter
// pub trait IntoOrderBy {
// 	type OrderParam;
// 	/// Convert the enum variant into a prisma order parameter, e.g. `media::name::order(SortOrder::Asc)`
// 	fn into_order(self, dir: SortOrder) -> Self::OrderParam;
// }

// #[derive(Default, Debug, OrderByGen)]
// #[prisma(module = "media_metadata")]
// pub enum MediaMetadataOrderBy {
// 	#[default]
// 	Title,
// 	Series,
// 	Number,
// 	Volume,
// 	Summary,
// 	Notes,
// 	AgeRating,
// 	Genre,
// 	Year,
// 	Month,
// 	Day,
// 	Writers,
// 	Pencillers,
// 	Inkers,
// 	Colorists,
// 	Letterers,
// 	CoverArtists,
// 	Editors,
// 	Publisher,
// 	Links,
// 	Characters,
// 	Teams,
// }

// #[derive(Default, Debug, OrderByGen)]
// #[prisma(module = "media")]
// pub enum MediaOrderBy {
// 	#[default]
// 	Name,
// 	Size,
// 	Extension,
// 	CreatedAt,
// 	UpdatedAt,
// 	Status,
// 	Path,
// 	Pages,
// 	Metadata(Vec<MediaMetadataOrderBy>),
// 	ModifiedAt,
// }

// // #[derive(Debug, Deserialize, Serialize)]
// // enum SeriesAggregateOrderBy {
// // 	Media,
// // }

// #[derive(Default, Debug, OrderByGen)]
// #[prisma(module = "series")]
// pub enum SeriesOrderBy {
// 	#[default]
// 	Name,
// 	Description,
// 	UpdatedAt,
// 	CreatedAt,
// 	Path,
// 	Status,
// 	// _Count(SeriesAggregateOrderBy),
// }

// // #[derive(Debug, OrderByGen)]
// // #[prisma(module = "library")]
// // enum LibraryAggregateOrderBy {
// // 	Media,
// // 	Series,
// // }

// #[derive(Default, Debug, OrderByGen)]
// #[prisma(module = "library")]
// pub enum LibraryOrderBy {
// 	#[default]
// 	Name,
// 	Path,
// 	Status,
// 	UpdatedAt,
// 	CreatedAt,
// 	// _Count(LibraryAggregateOrderBy),
// }

// #[derive(Default, Debug, OrderByGen)]
// #[prisma(module = "job")]
// pub enum JobOrderBy {
// 	#[default]
// 	Name,
// 	Status,
// 	CreatedAt,
// 	CompletedAt,
// }
