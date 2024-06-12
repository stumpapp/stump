#[derive(Debug, thiserror::Error)]
pub enum OPDSV2Error {
	#[error("Generated an invalid collection: {0}")]
	InvalidOPDSCollection(String),
	#[error("A query failed while generated OPDS feed: {0}")]
	QueryError(#[from] prisma_client_rust::queries::QueryError),
	#[error("Failed to generate OPDS feed: {0}")]
	InternalError(#[from] crate::CoreError),
}
