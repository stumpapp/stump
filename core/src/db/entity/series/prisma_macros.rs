use crate::prisma::{media as book, series, SortOrder};

// Note: I think the macro is generating code which is conflicting with `media`, because I have
// to alias `media` as `book` to avoid the conflict. FYI for future reference.
series::select!((book_filters: Vec<book::WhereParam>) => series_or_library_thumbnail {
	id
	media(book_filters).order_by(book::name::order(SortOrder::Asc)).take(1): select {
		id
		path
	}
	library: select {
		config
	}
});
