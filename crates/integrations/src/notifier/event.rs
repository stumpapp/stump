// TODO(logan): homework -> read https://doc.rust-iang.org/book/ch06-00-enums.html
pub enum NotifierEvent {
	// TODO(logan): these will be Stump related events, e.g ScanCompleted
	// An example might look like:
	// ScanCompleted {
	// 	success: bool,
	// 	library_name: String,
	// 	completed_task_count: u64,
	// },
	// Eventually, notifiers would take an event during the `send_message` trait function,
	// which would affect how the message gets sent (e.g. discord you can style a certain
	// event differently than another -> https://birdie0.github.io/discord-webhooks-guide/structure/embed/color.html
}
