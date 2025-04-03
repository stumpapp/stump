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
