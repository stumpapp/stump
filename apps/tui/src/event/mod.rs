pub mod sse;

pub enum CliEvent {
	StartTui,
	GracefulShutdown(Option<String>),
}

// TODO: remove this
#[allow(unused)]
pub enum TuiEvent {
	RerenderScreen,
	GracefulShutdown(Option<String>),
}
