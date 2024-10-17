use order_by_gen::OrderByGen;

trait IntoOrderBy {
	type OrderParam;

	fn into_prisma_order(self, direction: prisma::SortOrder) -> Self::OrderParam;
}

#[derive(OrderByGen)]
#[prisma_module("book_metadata")]
enum BookMetadataOrderBy {
	Title,
}

#[derive(OrderByGen)]
#[prisma_module("book")]
enum BookOrderBy {
	Name,
	Path,
	Metadata(BookMetadataOrderBy),
}

mod prisma {
	pub mod books {
		pub mod name {
			fn order() -> String {
				"prisma::books::name::order()".to_string()
			}
		}

		pub mod path {
			fn order() -> String {
				"prisma::books::path::order()".to_string()
			}
		}

		pub mod metadata {
			use crate::prisma::metadata::*;
		}
	}

	pub mod metadata {
		pub mod title {
			fn order() -> String {
				"metadata::title::order()".to_string()
			}
		}
	}

	pub enum SortOrder {
		Asc,
		Desc,
	}
}
