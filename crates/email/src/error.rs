use lettre::transport::smtp;

pub type EmailResult<T> = Result<T, EmailError>;

/// An error type that represents what can go wrong when sending an email
/// using the `email` crate.
#[derive(Debug, thiserror::Error)]
pub enum EmailError {
	#[error("Invalid email: {0}")]
	InvalidEmail(String),
	#[error("Failed to build email: {0}")]
	EmailBuildFailed(#[from] lettre::error::Error),
	#[error("The emailer config is missing a password")]
	NoPassword,
	#[error("Failed to send email: {0}")]
	SendFailed(#[from] smtp::Error),
	#[error("Failed to register template: {0}")]
	TemplateRegistrationFailed(#[from] handlebars::TemplateError),
	#[error("Template not found")]
	TempalateNotFound,
	#[error("Failed to render template: {0}")]
	TemplateRenderFailed(#[from] handlebars::RenderError),
}
