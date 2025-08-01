use derive_builder::UninitializedFieldError;

#[derive(Debug, thiserror::Error)]
pub enum OPDSV2Error {
	#[error("Failed to generate a valid OPDS feed: {0}")]
	FeedValidationFailed(String),
	#[error("OPDS feed field was not initialized: {0}")]
	MalformedFeed(#[from] UninitializedFieldError),
	#[error("A query failed while generated OPDS feed: {0}")]
	DBError(#[from] sea_orm::error::DbErr),
	#[error("Failed to generate OPDS feed: {0}")]
	InternalError(#[from] crate::CoreError),
}

impl From<OPDSV2Error> for crate::CoreError {
	fn from(err: OPDSV2Error) -> Self {
		match err {
			OPDSV2Error::FeedValidationFailed(msg) => {
				crate::CoreError::InternalError(msg)
			},
			OPDSV2Error::MalformedFeed(err) => err.into(),
			OPDSV2Error::DBError(err) => err.into(),
			OPDSV2Error::InternalError(err) => err,
		}
	}
}

#[cfg(test)]
mod tests {
	use super::*;

	#[test]
	fn test_opds_v2_error_from_core_error() {
		let core_err = crate::CoreError::InternalError("test".to_string());
		let opds_err: OPDSV2Error = core_err.into();

		assert!(matches!(opds_err, OPDSV2Error::InternalError(_)));
	}
}
