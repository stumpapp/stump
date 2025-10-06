use std::future::Future;

use tokio::signal;

pub async fn shutdown_signal_with_cleanup<F, Fut>(cleanup: Option<F>)
where
	F: FnOnce() -> Fut,
	Fut: Future<Output = ()>,
{
	let ctrl_c = async {
		signal::ctrl_c()
			.await
			.expect("Failed to install Ctrl+C handler");
	};

	#[cfg(unix)]
	let terminate = async {
		signal::unix::signal(signal::unix::SignalKind::terminate())
			.expect("Failed to install signal handler")
			.recv()
			.await;
	};

	#[cfg(not(unix))]
	let terminate = std::future::pending::<()>();

	tokio::select! {
		_ = ctrl_c => {},
		_ = terminate => {},
	}

	println!("Shutdown signal received, exiting...");

	if let Some(cleanup) = cleanup {
		println!("Running cleanup...");
		cleanup().await;
	}
}
