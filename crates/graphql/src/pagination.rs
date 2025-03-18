use async_graphql::{InputObject, OneofObject};
use sea_orm::{EntityTrait, Selector, SelectorTrait};

#[derive(Debug, Clone, InputObject)]
pub struct CursorPagination {
	pub cursor: String,
	pub limit: u32,
}

#[derive(Debug, Clone, InputObject)]
pub struct OffsetPagination {
	page: u32,
	page_size: u32,
}

#[derive(Debug, Clone, OneofObject)]
pub enum Pagination {
	Cursor(CursorPagination),
	Offset(OffsetPagination),
}

pub trait PageableEntity {
	fn apply_pagination<T: EntityTrait + SelectorTrait>(
		&self,
		selector: Selector<T>,
		pagination: Pagination,
	) -> Selector<T>;
}

// TODO: Custom pageable response or Connection from async-graphql? I don't think it
// supports offset pagination? So probably custom.
