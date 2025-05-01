use async_graphql::InputObject;
use models::{
	entity::{finished_reading_session, media, reading_session},
	shared::enums::{FileStatus, ReadingStatus},
};
use sea_orm::{
	prelude::{DateTimeWithTimeZone, *},
	sea_query::ConditionExpression,
};

use super::{
	apply_numeric_filter, apply_string_filter, media_metadata::MediaMetadataFilterInput,
	ConceptualFilter, IntoFilter, NumericFilter, StringLikeFilter,
};

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
pub struct MediaFilterInput {
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
	pub metadata: Option<MediaMetadataFilterInput>,

	#[graphql(name = "_and", default)]
	pub _and: Option<Vec<MediaFilterInput>>,
	#[graphql(name = "_not", default)]
	pub _not: Option<Vec<MediaFilterInput>>,
	#[graphql(name = "_or", default)]
	pub _or: Option<Vec<MediaFilterInput>>,
}

impl IntoFilter for MediaFilterInput {
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

// #[cfg(test)]
// mod tests {
// 	use super::*;
// 	use models::entity::*;

// 	#[test]
// 	fn test_serialize_media_filter() {
// 		let filter = MediaFilterInput {
// 			name: Some(FieldFilter::Equals {
// 				eq: "test".to_string(),
// 			}),
// 			..Default::default()
// 		};

// 		let serialized = serde_json::to_string(&filter).unwrap();
// 		assert_eq!(serialized, r#"{"name":{"eq":"test"}}"#);
// 	}

// 	#[test]
// 	fn test_serialize_media_filter_with_metadata() {
// 		let filter = MediaFilterInput {
// 			name: Some(FieldFilter::Equals {
// 				eq: "test".to_string(),
// 			}),
// 			metadata: Some(MediaMetadataFilterInput {
// 				title: Some(FieldFilter::Equals {
// 					eq: "test".to_string(),
// 				}),
// 				series: Some(FieldFilter::Equals {
// 					eq: "theseries".to_string(),
// 				}),
// 				..Default::default()
// 			}),
// 			..Default::default()
// 		};

// 		let serialized = serde_json::to_string(&filter).unwrap();
// 		assert_eq!(
// 			serialized,
// 			r#"{"name":{"eq":"test"},"metadata":{"title":{"eq":"test"},"series":{"eq":"theseries"}}}"#
// 		);
// 	}

// 	#[test]
// 	fn test_serialize_media_filter_with_and() {
// 		let filter = MediaFilterInput {
// 			_and: Some(vec![
// 				MediaFilterInput {
// 					name: Some(FieldFilter::Equals {
// 						eq: "test".to_string(),
// 					}),
// 					..Default::default()
// 				},
// 				MediaFilterInput {
// 					name: Some(FieldFilter::Equals {
// 						eq: "test2".to_string(),
// 					}),
// 					..Default::default()
// 				},
// 			]),
// 			..Default::default()
// 		};

// 		let serialized = serde_json::to_string(&filter).unwrap();
// 		assert_eq!(
// 			serialized,
// 			r#"{"_and":[{"name":{"eq":"test"}},{"name":{"eq":"test2"}}]}"#
// 		);
// 	}

// 	#[test]
// 	fn test_serialize_media_filter_with_metadata_with_ands() {
// 		let filter = MediaFilterInput {
// 			name: Some(FieldFilter::Equals {
// 				eq: "test".to_string(),
// 			}),
// 			metadata: Some(MediaMetadataFilterInput {
// 				_and: Some(vec![
// 					MediaMetadataFilterInput {
// 						title: Some(FieldFilter::Equals {
// 							eq: "test".to_string(),
// 						}),
// 						..Default::default()
// 					},
// 					MediaMetadataFilterInput {
// 						series: Some(FieldFilter::Equals {
// 							eq: "theseries".to_string(),
// 						}),
// 						..Default::default()
// 					},
// 				]),
// 				..Default::default()
// 			}),
// 			..Default::default()
// 		};

// 		let serialized = serde_json::to_string(&filter).unwrap();
// 		assert_eq!(
// 			serialized,
// 			r#"{"name":{"eq":"test"},"metadata":{"_and":[{"title":{"eq":"test"}},{"series":{"eq":"theseries"}}]}}"#
// 		);
// 	}

// 	#[test]
// 	fn test_deserialize_grouped_media_filter() {
// 		let filter = r#"{"_and":[{"name":{"eq":"test"}},{"name":{"eq":"test2"}}]}"#;
// 		let deserialized: MediaFilterInput = serde_json::from_str(filter).unwrap();
// 		assert!(deserialized._and.is_some());
// 		assert_eq!(deserialized._and.unwrap().len(), 2);

// 		let filter = r#"{"_or":[{"name":{"eq":"test"}},{"name":{"eq":"test2"}}]}"#;
// 		let deserialized: MediaFilterInput = serde_json::from_str(filter).unwrap();
// 		assert!(deserialized._or.is_some());
// 		assert_eq!(deserialized._or.unwrap().len(), 2);

// 		let filter = r#"{"_not":[{"name":{"eq":"test"}},{"name":{"eq":"test2"}}]}"#;
// 		let deserialized: MediaFilterInput = serde_json::from_str(filter).unwrap();
// 		assert!(deserialized._not.is_some());
// 		assert_eq!(deserialized._not.unwrap().len(), 2);
// 	}

// 	#[test]
// 	fn test_deserialize_grouped_media_filter_with_meta() {
// 		let filter = r#"{"_and":[{"name":{"eq":"test"}},{"metadata":{"_and":[{"title":{"eq":"test"}},{"series":{"eq":"theseries"}}]}}]}"#;
// 		let deserialized: MediaFilterInput = serde_json::from_str(filter).unwrap();
// 		assert!(deserialized._and.is_some());
// 		let and_vec = deserialized._and.clone().unwrap();
// 		assert_eq!(and_vec.len(), 2);
// 		let second_input = and_vec.get(1).unwrap().clone();
// 		assert!(second_input.metadata.is_some());
// 		let metadata = second_input.metadata.unwrap();
// 		assert!(metadata._and.is_some());
// 		assert_eq!(metadata._and.unwrap().len(), 2);
// 	}

// 	#[test]
// 	fn test_basic_into_filter() {
// 		let condition = MediaFilterInput {
// 			name: Some(FieldFilter::Equals {
// 				eq: "test".to_string(),
// 			}),
// 			..Default::default()
// 		}
// 		.into_filter();
// 		assert_eq!(
// 			condition,
// 			sea_orm::Condition::all().add(media::Column::Name.eq("test"))
// 		);

// 		let condition = MediaFilterInput {
// 			name: Some(FieldFilter::Not {
// 				neq: "test".to_string(),
// 			}),
// 			..Default::default()
// 		}
// 		.into_filter();
// 		assert_eq!(
// 			condition,
// 			sea_orm::Condition::all().add(media::Column::Name.ne("test"))
// 		);

// 		let condition = MediaFilterInput {
// 			name: Some(FieldFilter::Any {
// 				any: vec!["test".to_string(), "test2".to_string()],
// 			}),
// 			..Default::default()
// 		}
// 		.into_filter();
// 		assert_eq!(
// 			condition,
// 			sea_orm::Condition::all()
// 				.add(media::Column::Name.is_in(vec!["test", "test2"]))
// 		);

// 		let condition = MediaFilterInput {
// 			name: Some(FieldFilter::None {
// 				none: vec!["test".to_string(), "test2".to_string()],
// 			}),
// 			..Default::default()
// 		}
// 		.into_filter();
// 		assert_eq!(
// 			condition,
// 			sea_orm::Condition::all()
// 				.add(media::Column::Name.is_not_in(vec!["test", "test2"]))
// 		);

// 		let condition = MediaFilterInput {
// 			name: Some(FieldFilter::StringFieldFilter(StringFilter::Like {
// 				like: "test".to_string(),
// 			})),
// 			..Default::default()
// 		}
// 		.into_filter();
// 		assert_eq!(
// 			condition,
// 			sea_orm::Condition::all()
// 				.add(media::Column::Name.like(format!("%{}%", "test")))
// 		);

// 		let condition = MediaFilterInput {
// 			name: Some(FieldFilter::StringFieldFilter(StringFilter::Contains {
// 				contains: "test".to_string(),
// 			})),
// 			..Default::default()
// 		}
// 		.into_filter();
// 		assert_eq!(
// 			condition,
// 			sea_orm::Condition::all().add(media::Column::Name.contains("test"))
// 		);

// 		let condition = MediaFilterInput {
// 			name: Some(FieldFilter::StringFieldFilter(StringFilter::Excludes {
// 				excludes: "test".to_string(),
// 			})),
// 			..Default::default()
// 		}
// 		.into_filter();
// 		assert_eq!(
// 			condition,
// 			sea_orm::Condition::all()
// 				.add(media::Column::Name.not_like(format!("%{}%", "test")))
// 		);
// 	}

// 	#[test]
// 	fn test_grouped_into_filter() {
// 		// _and
// 		let condition = MediaFilterInput {
// 			_and: Some(vec![
// 				MediaFilterInput {
// 					name: Some(FieldFilter::Equals {
// 						eq: "test".to_string(),
// 					}),
// 					..Default::default()
// 				},
// 				MediaFilterInput {
// 					name: Some(FieldFilter::Equals {
// 						eq: "test2".to_string(),
// 					}),
// 					..Default::default()
// 				},
// 			]),
// 			..Default::default()
// 		}
// 		.into_filter();
// 		assert_eq!(
// 			condition,
// 			sea_orm::Condition::all().add(
// 				sea_orm::Condition::all()
// 					.add(media::Column::Name.eq("test"))
// 					.add(media::Column::Name.eq("test2"))
// 			)
// 		);

// 		// _or
// 		let condition = MediaFilterInput {
// 			_or: Some(vec![
// 				MediaFilterInput {
// 					name: Some(FieldFilter::Equals {
// 						eq: "test".to_string(),
// 					}),
// 					..Default::default()
// 				},
// 				MediaFilterInput {
// 					name: Some(FieldFilter::Equals {
// 						eq: "test2".to_string(),
// 					}),
// 					..Default::default()
// 				},
// 			]),
// 			..Default::default()
// 		}
// 		.into_filter();
// 		assert_eq!(
// 			condition,
// 			sea_orm::Condition::all().add(
// 				sea_orm::Condition::any()
// 					.add(media::Column::Name.eq("test"))
// 					.add(media::Column::Name.eq("test2"))
// 			)
// 		);

// 		// _not
// 		let condition = MediaFilterInput {
// 			_not: Some(vec![
// 				MediaFilterInput {
// 					name: Some(FieldFilter::Equals {
// 						eq: "test".to_string(),
// 					}),
// 					..Default::default()
// 				},
// 				MediaFilterInput {
// 					name: Some(FieldFilter::Equals {
// 						eq: "test2".to_string(),
// 					}),
// 					..Default::default()
// 				},
// 			]),
// 			..Default::default()
// 		}
// 		.into_filter();
// 		assert_eq!(
// 			condition,
// 			sea_orm::Condition::all().add(
// 				sea_orm::Condition::any()
// 					.add(media::Column::Name.eq("test"))
// 					.add(media::Column::Name.eq("test2"))
// 					.not()
// 			)
// 		);
// 	}

// 	#[test]
// 	fn test_nested_into_filter() {
// 		let condition = MediaFilterInput {
// 			name: Some(FieldFilter::Equals {
// 				eq: "test".to_string(),
// 			}),
// 			metadata: Some(MediaMetadataFilterInput {
// 				title: Some(FieldFilter::Equals {
// 					eq: "test".to_string(),
// 				}),
// 				series: Some(FieldFilter::Equals {
// 					eq: "theseries".to_string(),
// 				}),
// 				..Default::default()
// 			}),
// 			..Default::default()
// 		}
// 		.into_filter();
// 		assert_eq!(
// 			condition,
// 			sea_orm::Condition::all()
// 				.add(media::Column::Name.eq("test"))
// 				.add(
// 					sea_orm::Condition::all()
// 						.add(media_metadata::Column::Title.eq("test"))
// 						.add(media_metadata::Column::Series.eq("theseries"))
// 				)
// 		);
// 	}
// }
