use order_by_gen::OrderByGen;

trait IntoOrderBy {
	type OrderParam;
	fn into_prisma_order(self, direction: prisma::SortOrder) -> Self::OrderParam;
}

#[derive(OrderByGen)]
#[prisma(module = "book_metadata")]
enum BookMetadataOrderBy {
	Title,
}

#[derive(OrderByGen)]
#[prisma(module = "book")]
enum BookOrderBy {
	Name,
	Path,
	Metadata(BookMetadataOrderBy),
}

mod prisma {
	use std::fmt::Display;

	pub mod books {
		pub mod name {
			fn order(dir: crate::prisma::SortOrder) -> String {
				format!("prisma::books::name::order({dir})")
			}
		}

		pub mod path {
			fn order(dir: crate::prisma::SortOrder) -> String {
				format!("prisma::books::path::order({dir})")
			}
		}

		pub mod metadata {
			pub fn order(dir: crate::prisma::SortOrder) -> String {
				format!("prisma::books::metadata::order({dir})")
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
			fn order(dir: crate::prisma::SortOrder) -> String {
				format!("metadata::title::order({dir})")
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
	use super::*;

	#[test]
	fn test_book_order_by_gen() {
		assert_eq!(
			BookOrderBy::Name.into_prisma_order(prisma::SortOrder::Asc),
			"prisma::books::name::order(asc)"
		);
		assert_eq!(
			BookOrderBy::Name.into_prisma_order(prisma::SortOrder::Desc),
			"prisma::books::name::order(desc)"
		);

		assert_eq!(
			BookOrderBy::Path.into_prisma_order(prisma::SortOrder::Asc),
			"prisma::books::path::order(asc)"
		);
		assert_eq!(
			BookOrderBy::Path.into_prisma_order(prisma::SortOrder::Desc),
			"prisma::books::path::order(desc)"
		);

		assert_eq!(
			BookOrderBy::Metadata(BookMetadataOrderBy::Title)
				.into_prisma_order(prisma::SortOrder::Asc),
			"metadata::title::order(asc)"
		);
		assert_eq!(
			BookOrderBy::Metadata(BookMetadataOrderBy::Title)
				.into_prisma_order(prisma::SortOrder::Desc),
			"metadata::title::order(desc)"
		);
	}

	#[test]
	fn test_book_metadata_order_by_gen() {
		assert_eq!(
			BookMetadataOrderBy::Title.into_prisma_order(prisma::SortOrder::Asc),
			"metadata::title::order(asc)"
		);
		assert_eq!(
			BookMetadataOrderBy::Title.into_prisma_order(prisma::SortOrder::Desc),
			"metadata::title::order(desc)"
		);
	}
}
