pub mod epub;
pub mod library;
pub mod log;
pub mod media;
pub mod read_progress;
pub mod reading_list;
pub mod series;
pub mod tag;
pub mod user;

pub use crate::db::models::epub::*;
pub use crate::db::models::log::*;

pub use library::*;
pub use media::*;
pub use read_progress::*;
pub use reading_list::*;
pub use series::*;
pub use tag::*;
pub use user::*;

// TODO: RESTRUCTURE THIS CRATE
// I don't think I need the `models` and `dao` sub crates anymore. I want to simplify and flatten.
// I also will house all of the prisma select/include macros in the corresponding file(s).

// TODO: move this
pub trait Cursor {
	fn cursor(&self) -> String;
}
