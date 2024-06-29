use derive_builder::UninitializedFieldError;

#[derive(Debug, thiserror::Error)]
pub enum OPDSV2Error {
	#[error("Failed to generate a valid OPDS feed: {0}")]
	FeedValidationFailed(String),
	#[error("OPDS feed field was not initialized: {0}")]
	MalformedFeed(#[from] UninitializedFieldError),
	#[error("A query failed while generated OPDS feed: {0}")]
	QueryError(#[from] prisma_client_rust::queries::QueryError),
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
			OPDSV2Error::QueryError(err) => err.into(),
			OPDSV2Error::InternalError(err) => err,
		}
	}
}
