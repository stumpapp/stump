pub enum NotifierEvent {
	ScanCompleted {
		books_added: u64,
		library_name: String,
	},
}

impl NotifierEvent {
	pub fn into_message(self) -> String {
		match self {
			NotifierEvent::ScanCompleted {
				books_added,
				library_name,
			} => {
				let is_plural = books_added == 0 || books_added > 1;
				let book_or_books = if is_plural { "books" } else { "book" };
				format!(
					"{} {} added to {}",
					books_added, book_or_books, library_name
				)
			},
		}
	}
}
