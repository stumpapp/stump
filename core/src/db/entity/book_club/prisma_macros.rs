use crate::prisma::{book_club, book_club_member};

book_club::include!((filters: Vec<book_club_member::WhereParam>) => book_club_member_user_username {
	members(filters): include {
		user: select {
			username
		}
	}
});

book_club::include!((filters: Vec<book_club_member::WhereParam>) => book_club_member_and_schedule_include {
	members(filters): include {
		user: select {
			username
		}
	}
	schedule
});

// TODO: filter future books if not admin!
book_club::include!((filters: Vec<book_club_member::WhereParam>) => book_club_with_books_include {
	members(filters): include {
		user: select {
			username
		}
	}
	schedule: include {
		books
	}
});

book_club::include!(book_club_with_schedule { schedule });
