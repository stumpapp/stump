use crate::prisma::{book_club, book_club_book, book_club_member};

// TODO: determine if still needed, if not move filters to book_club_member_with_user
book_club::include!((filters: Vec<book_club_member::WhereParam>) => book_club_include_member_with_user {
	members(filters): include {
		user: select {
			id
			username
			is_server_owner
			avatar_url
			created_at
		}
	}
});

book_club::include!((filters: Vec<book_club_member::WhereParam>) => book_club_member_and_schedule_include {
	members(filters): include {
		user: select {
			id
			username
			is_server_owner
			avatar_url
			created_at
		}
	}
	schedule
});

book_club::include!((
	filters: Vec<book_club_member::WhereParam>,
	book_filters: Vec<book_club_book::WhereParam>
) => book_club_with_books_include {
	members(filters): include {
		user: select {
			id
			username
			is_server_owner
			avatar_url
			created_at
		}
	}
	schedule: include {
		books(book_filters)
	}
});

book_club::include!(book_club_with_schedule { schedule });

book_club_member::include!(book_club_member_with_user {
	user: select {
		id
		username
		is_server_owner
		avatar_url
		created_at
	}
});
