use governor::{
	clock::DefaultClock,
	state::{InMemoryState, NotKeyed},
	Quota, RateLimiter as GovernorLimiter,
};
use std::{num::NonZeroU32, sync::Arc};

/// A simple rate limiter wrapping [`governor::RateLimiter`]
#[derive(Clone)]
pub struct RateLimiter {
	inner: Arc<GovernorLimiter<NotKeyed, InMemoryState, DefaultClock>>,
}

impl RateLimiter {
	/// Creates a new rate limiter with the specified requests per second
	///
	/// # Panics
	/// Panics if `requests_per_second` is 0
	pub fn new(requests_per_second: u32) -> Self {
		let quota = Quota::per_second(
			NonZeroU32::new(requests_per_second)
				.expect("requests_per_second must be > 0"),
		);
		Self {
			inner: Arc::new(GovernorLimiter::direct(quota)),
		}
	}

	/// Waits until a request is permitted by the rate limiter
	pub async fn until_ready(&self) {
		self.inner.until_ready().await;
	}

	/// Attempts to acquire permission for a request without waiting
	///
	/// Returns `false` if rate limited
	pub fn try_acquire(&self) -> bool {
		self.inner.check().is_ok()
	}
}

#[cfg(test)]
mod tests {
	use super::*;

	#[test]
	fn test_rate_limiter_creation() {
		let limiter = RateLimiter::new(10);
		assert!(limiter.try_acquire());
	}

	#[test]
	#[should_panic(expected = "requests_per_second must be > 0")]
	fn test_rate_limiter_zero_rps() {
		let _ = RateLimiter::new(0);
	}
}
