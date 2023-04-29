// TODO: fix all these pub uses

mod common;
pub mod epub;
pub mod library;
pub mod log;
pub mod media;
pub mod read_progress;
pub mod reading_list;
pub mod series;
pub mod tag;
pub mod user;

pub use crate::db::entity::epub::*;
pub use crate::db::entity::log::*;

pub use library::*;
pub use media::*;
pub use read_progress::*;
pub use reading_list::*;
pub use series::*;
pub use tag::*;
pub use user::*;

// TODO: move this
pub trait Cursorable {
	fn cursor(&self) -> String;
}
