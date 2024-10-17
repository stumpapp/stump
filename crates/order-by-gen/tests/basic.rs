use order_by_gen::OrderByGen;

trait IntoOrderBy {
	type OrderParam;
	fn order_fn(self) -> fn(prisma::SortOrder) -> Self::OrderParam;
}

struct QueryOrder<T>
where
	T: IntoOrderBy,
{
	dir: prisma::SortOrder,
	order: T,
}

impl<T> QueryOrder<T>
where
	T: IntoOrderBy,
{
	fn into_prisma_order(self) -> T::OrderParam {
		(self.order.order_fn())(self.dir)
	}
}

#[derive(OrderByGen)]
#[prisma(module = "book_metadata")]
enum BookMetadataOrderBy {
	Title,
}

#[derive(OrderByGen)]
#[prisma(module = "books")]
enum BookOrderBy {
	Name,
	Path,
	// Metadata(BookMetadataOrderBy),
}

mod prisma {
	use std::fmt::Display;

	pub mod books {
		pub mod name {
			pub fn order(
				dir: crate::prisma::SortOrder,
			) -> super::OrderByWithRelationParam {
				super::OrderByWithRelationParam::Name
			}
		}

		pub mod path {
			pub fn order(
				dir: crate::prisma::SortOrder,
			) -> super::OrderByWithRelationParam {
				super::OrderByWithRelationParam::Path
			}
		}

		pub mod metadata {
			pub fn order(
				dir: crate::prisma::SortOrder,
			) -> super::OrderByWithRelationParam {
				super::OrderByWithRelationParam::Metadata(
					crate::prisma::book_metadata::OrderByWithRelationParam::Title,
				)
			}
		}

		pub enum OrderByWithRelationParam {
			Name,
			Path,
			Metadata(crate::prisma::book_metadata::OrderByWithRelationParam),
		}
	}

	pub mod book_metadata {
		pub mod title {
			pub fn order(
				dir: crate::prisma::SortOrder,
			) -> super::OrderByWithRelationParam {
				super::OrderByWithRelationParam::Title
			}
		}

		pub enum OrderByWithRelationParam {
			Title,
		}
	}

	pub enum SortOrder {
		Asc,
		Desc,
	}

	impl Display for SortOrder {
		fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
			match self {
				SortOrder::Asc => write!(f, "asc"),
				SortOrder::Desc => write!(f, "desc"),
			}
		}
	}
}

#[cfg(test)]
mod tests {
	// use super::*;

	// #[test]
	// fn test_book_order_by_gen() {
	// 	assert_eq!(
	// 		BookOrderBy::Name.into_prisma_order(prisma::SortOrder::Asc),
	// 		"prisma::books::name::order(asc)"
	// 	);
	// 	assert_eq!(
	// 		BookOrderBy::Name.into_prisma_order(prisma::SortOrder::Desc),
	// 		"prisma::books::name::order(desc)"
	// 	);

	// 	assert_eq!(
	// 		BookOrderBy::Path.into_prisma_order(prisma::SortOrder::Asc),
	// 		"prisma::books::path::order(asc)"
	// 	);
	// 	assert_eq!(
	// 		BookOrderBy::Path.into_prisma_order(prisma::SortOrder::Desc),
	// 		"prisma::books::path::order(desc)"
	// 	);

	// 	assert_eq!(
	// 		BookOrderBy::Metadata(BookMetadataOrderBy::Title)
	// 			.into_prisma_order(prisma::SortOrder::Asc),
	// 		"metadata::title::order(asc)"
	// 	);
	// 	assert_eq!(
	// 		BookOrderBy::Metadata(BookMetadataOrderBy::Title)
	// 			.into_prisma_order(prisma::SortOrder::Desc),
	// 		"metadata::title::order(desc)"
	// 	);
	// }

	// #[test]
	// fn test_book_metadata_order_by_gen() {
	// 	assert_eq!(
	// 		BookMetadataOrderBy::Title.into_prisma_order(prisma::SortOrder::Asc),
	// 		"metadata::title::order(asc)"
	// 	);
	// 	assert_eq!(
	// 		BookMetadataOrderBy::Title.into_prisma_order(prisma::SortOrder::Desc),
	// 		"metadata::title::order(desc)"
	// 	);
	// }
}
