use chrono::{DateTime, Utc};

/// Gets the current UTC time as a DateTime<Utc>. If the current environment is a test, this
/// function will use [`tokio::time::Instant`] and calculate the current time from that. Ensure
/// you are running the test within a tokio runtime with the `start_paused = true` annotation.
///
/// See https://docs.rs/tokio/latest/tokio/time/fn.pause.html
pub fn current_utc_time() -> DateTime<Utc> {
	if cfg!(test) {
		// This is a hack to make tests deterministic
		let instant = tokio::time::Instant::now();
		let duration_since_epoch = instant.duration_since(instant);
		let system_time = std::time::UNIX_EPOCH + duration_since_epoch;
		system_time.into()
	} else {
		Utc::now()
	}
}

#[cfg(test)]
mod tests {
	use super::*;

	#[tokio::test(start_paused = true)]
	async fn test_current_utc_time() {
		let now = current_utc_time();
		// sleep for 1 second to ensure the time has "changed"
		tokio::time::sleep(tokio::time::Duration::from_secs(1)).await;
		let new_now = current_utc_time();
		assert_eq!(new_now.timestamp(), now.timestamp());
	}
}
