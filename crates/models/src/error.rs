// TODO: rename this? DatabaseError? ModelError?

#[derive(Debug, thiserror::Error)]
pub enum EntityError {
	#[error("Invalid data was retrieved from the database: {0}")]
	BadData(String),
	#[error("An error occurred while interacting with the database: {0}")]
	DbError(#[from] sea_orm::error::DbErr),
	#[error("Invalid ignore rules were provided: {0}")]
	InvalidIgnoreRules(String),
	#[error("The requested column does not exist")]
	ColumnDoesNotExist,
	#[error("Invalid API key provided")]
	InvalidAPIKey,
}

impl From<globset::Error> for EntityError {
	fn from(error: globset::Error) -> Self {
		EntityError::InvalidIgnoreRules(error.to_string())
	}
}

impl From<serde_json::Error> for EntityError {
	fn from(error: serde_json::Error) -> Self {
		EntityError::BadData(error.to_string())
	}
}
