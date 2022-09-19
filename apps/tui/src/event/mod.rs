pub mod sse;

pub enum CliEvent {
	StartTui,
	GracefulShutdown(Option<String>),
}

pub enum TuiEvent {
	RerenderScreen,
	GracefulShutdown(Option<String>),
}
