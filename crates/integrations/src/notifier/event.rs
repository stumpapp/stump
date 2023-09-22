pub enum NotifierEvent {
	ScanCompleted {
		books_added: u64,
		library_name: String,
	},
}
